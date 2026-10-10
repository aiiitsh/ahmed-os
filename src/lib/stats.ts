import { EX, GOALS, GROUPS } from '../data/program'
import type { Data } from './store'
import type { Group, HabitEntry, Log, SleepRow, Workout, WorkoutSet, FocusBlock } from './types'
import { addDays, daysBetween, dow, inWeek, localDate, localMinutes, minutesBetween, weekDays } from './time'

// ---------- muscle credit ----------

export function groupSets(workouts: Workout[], sets: WorkoutSet[]): Record<Group, number> {
  const out = Object.fromEntries(GROUPS.map((g) => [g.key, 0])) as Record<Group, number>
  const ids = new Set(workouts.map((w) => w.id))
  for (const w of workouts) {
    if (!w.skill_done || !w.skill_key) continue
    const ex = EX[`skill_${w.skill_key}`]
    for (const [g, n] of Object.entries(ex?.credit ?? {})) out[g as Group] += n!
  }
  for (const s of sets) {
    if (!ids.has(s.workout_id) || s.skipped) continue
    const ex = EX[s.exercise_key]
    if (!ex || !ex.sets) continue
    const ratio = (s.sets ?? ex.sets) / ex.sets
    for (const [g, n] of Object.entries(ex.credit)) out[g as Group] += n! * ratio
  }
  for (const k of Object.keys(out) as Group[]) out[k] = Math.round(out[k] * 10) / 10
  return out
}

export type Level = 'rest' | 'light' | 'solid' | 'peak'
export function levelFor(pct: number): Level {
  if (pct <= 0) return 'rest'
  if (pct < 0.34) return 'light'
  if (pct < 0.8) return 'solid'
  return 'peak'
}

// ---------- sleep ----------

/** Bedtimes before noon are treated as after midnight (+24h) so averages wrap correctly. */
export const bedMinutes = (iso: string) => {
  const m = localMinutes(iso)
  return m < 12 * 60 ? m + 1440 : m
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const sd = (xs: number[]) => {
  const m = mean(xs)
  if (m == null || xs.length < 2) return null
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length)
}

export function sleepStats(rows: SleepRow[]) {
  const beds = rows.filter((r) => r.bed_at).map((r) => bedMinutes(r.bed_at!))
  const wakes = rows.filter((r) => r.wake_at).map((r) => localMinutes(r.wake_at!))
  const mins = rows.filter((r) => r.minutes != null).map((r) => r.minutes!)
  return {
    nights: mins.length,
    avgMinutes: mean(mins),
    avgBed: mean(beds),
    avgWake: mean(wakes),
    bedSpread: sd(beds),
  }
}

// ---------- focus ----------

export function focusStats(blocks: FocusBlock[]) {
  const focus = blocks.filter((b) => b.block_type === 'focus')
  const breaks = blocks.filter((b) => b.block_type === 'break')
  const lens = focus.map((b) => minutesBetween(b.started_at, b.ended_at))
  const total = lens.reduce((a, b) => a + b, 0)
  const rest = breaks.reduce((a, b) => a + minutesBetween(b.started_at, b.ended_at), 0)
  return {
    total, rest, blocks: focus.length,
    longest: lens.length ? Math.max(...lens) : 0,
    average: lens.length ? total / lens.length : 0,
    ratio: rest > 0 ? total / rest : null,
    lost: focus.filter((b) => b.end_reason === 'lost_focus').length,
  }
}

// ---------- streak (habit) ----------

export function habitStats(entries: HabitEntry[], today = localDate()) {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const positives = sorted.filter((e) => e.count > 0).map((e) => e.entry_date)
  const first = sorted[0]?.entry_date
  let current = 0
  if (positives.length) {
    const last = positives[positives.length - 1]
    current = Math.max(0, daysBetween(last, today))
  } else if (first) {
    current = daysBetween(first, today) + 1
  }
  let best = current
  for (let i = 1; i < positives.length; i++) best = Math.max(best, daysBetween(positives[i - 1], positives[i]) - 1)
  if (positives.length && first && first < positives[0]) best = Math.max(best, daysBetween(first, positives[0]))

  const month = today.slice(0, 7)
  const monthRows = sorted.filter((e) => e.entry_date.startsWith(month) && e.count > 0)
  const sumRange = (from: string, to: string) =>
    sorted.filter((e) => e.entry_date >= from && e.entry_date <= to).reduce((a, e) => a + e.count, 0)
  const last8 = sumRange(addDays(today, -55), today)
  const wdCount = Array(7).fill(0)
  for (const e of sorted) if (e.count > 0) wdCount[dow(e.entry_date)] += e.count
  const topWd = wdCount.some((x) => x > 0) ? wdCount.indexOf(Math.max(...wdCount)) : null

  return {
    current, best, hasAny: sorted.length > 0,
    monthTimes: monthRows.reduce((a, e) => a + e.count, 0),
    monthDays: monthRows.length,
    avgPerWeek: last8 / 8,
    topWeekday: topWd,
    last7: sumRange(addDays(today, -6), today),
    prev7: sumRange(addDays(today, -13), addDays(today, -7)),
  }
}

// ---------- quran ----------

export function quranStreak(logs: Log[], today = localDate()): number {
  const days = new Set(logs.filter((l) => l.type === 'quran').map((l) => l.local_date))
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}

// ---------- full week ----------

export function weekStats(data: Data, start: string) {
  const days = weekDays(start)
  const wk = <T,>(rows: T[], f: (r: T) => string) => rows.filter((r) => inWeek(f(r), start))
  const workouts = wk(data.workouts, (w) => w.local_date)
  const wIds = new Set(workouts.map((w) => w.id))
  const sets = data.sets.filter((s) => wIds.has(s.workout_id))
  const logs = wk(data.logs, (l) => l.local_date)
  const sleep = wk(data.sleep, (s) => s.wake_date)
  const focus = wk(data.focus, (f) => f.local_date)
  const byType = (t: string) => logs.filter((l) => l.type === t)

  const groups = groupSets(workouts, sets)
  const feelSets = sets.filter((s) => s.feel && !s.skipped)
  const hard = feelSets.filter((s) => s.feel === 'hard').length
  const bw = data.logs.filter((l) => l.type === 'bodyweight').sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const bwIn = bw.filter((l) => inWeek(l.local_date, start))
  const bwBefore = bw.filter((l) => l.local_date < start)
  const quran = byType('quran')
  const french = byType('french')
  const frenchMin = french.reduce((a, l) => a + (l.data.minutes || 0), 0)

  const sl = sleepStats(sleep)
  const fo = focusStats(focus)
  const byDayCode = { A: 0, B: 0, C: 0 }
  for (const w of workouts) byDayCode[w.day_code]++

  const quranDays = new Set(quran.map((l) => l.local_date)).size
  const ring = [
    Math.min(1, workouts.length / GOALS.sessions),
    Math.min(1, (sl.avgMinutes ?? 0) / 60 / GOALS.sleepHours),
    Math.min(1, fo.total / 60 / GOALS.focusHours),
    Math.min(1, quranDays / GOALS.quranDays),
  ]

  return {
    start, end: days[6], days,
    workouts, sets, byDayCode, groups,
    cardio: byType('cardio'),
    stretches: byType('stretch'),
    hipFlexor: byType('stretch').filter((l) => l.data.which === 'hip_flexors').length,
    flags: byType('flag'),
    proteinDays: new Set(byType('protein').map((l) => l.local_date)).size,
    bodyweight: { last: bwIn.at(-1)?.data.kg ?? null, before: bwBefore.at(-1)?.data.kg ?? null },
    hardPct: feelSets.length ? hard / feelSets.length : 0,
    sleep, sl, focus, fo,
    quranDays, juzRevised: new Set(quran.map((l) => l.data.juz)).size,
    frenchMin, frenchDays: new Set(french.filter((l) => l.data.minutes > 0).map((l) => l.local_date)).size,
    unitsFinished: french.filter((l) => l.data.activity === 'finished_unit').length,
    ringPct: ring.reduce((a, b) => a + b, 0) / ring.length,
  }
}
export type WeekStats = ReturnType<typeof weekStats>

// ---------- insights (section 9.5) ----------

export interface Insight { text: string; bad: boolean }

export function insights(w: WeekStats, prev: WeekStats, extra: { streak?: { now: number; last: number } } = {}): Insight[] {
  const out: Insight[] = []
  const n = w.workouts.length
  const g = w.groups
  out.push(n < 3
    ? { bad: true, text: `Only ${n} session${n === 1 ? '' : 's'}. Aim for 3–4 (A, B, C + one more).` }
    : { bad: false, text: `${n} sessions. Solid week.` })
  out.push(g.arms < 12
    ? { bad: true, text: `Arms got ${sets(g.arms)}. Big arms needs 12–20.` }
    : { bad: false, text: `Arms got ${sets(g.arms)}. In range.` })
  if (g.pull > 1.6 * g.push && g.pull > 0) out.push({ bad: true, text: `Pull ${fmt1(g.pull)} vs push ${fmt1(g.push)}: pull-heavy. Keep planche days in.` })
  else if (g.push > 1.6 * g.pull && g.push > 0) out.push({ bad: true, text: `Push ${fmt1(g.push)} vs pull ${fmt1(g.pull)}: push-heavy. Tight chest, so watch it.` })
  else if (g.push + g.pull > 0) out.push({ bad: false, text: `Push/pull balanced (${fmt1(g.push)} / ${fmt1(g.pull)}).` })
  if (g.posterior === 0 || w.byDayCode.C === 0) out.push({ bad: true, text: 'No posture day. Hamstrings and glutes hold your pelvis.' })
  if (g.core < 8) out.push({ bad: true, text: `Core got ${sets(g.core)}. Aim for 8–14 to stand tall.` })
  if (w.hipFlexor < 2) out.push({ bad: true, text: `Hip flexor stretch ${w.hipFlexor}×. Do it at least 2× a week for APT.` })
  if (w.sl.avgMinutes != null && w.sl.avgMinutes < 7 * 60) out.push({ bad: true, text: `Sleep averaged ${(w.sl.avgMinutes / 60).toFixed(1)} h. Target 7.5–8.5 h.` })
  else if (w.sl.avgMinutes != null) out.push({ bad: false, text: `Sleep averaged ${(w.sl.avgMinutes / 60).toFixed(1)} h.` })
  if (w.sl.bedSpread != null && w.sl.bedSpread > 90) out.push({ bad: true, text: `Bedtime spread ${Math.round(w.sl.bedSpread)} min. Keep it under 60.` })
  if (w.hardPct > 0.5) out.push({ bad: true, text: 'Lots of Hard. Hold weights next week / deload.' })
  if (w.flags.length >= 2) out.push({ bad: true, text: `Back felt tight ${w.flags.length} times. Check which days.` })
  if (w.proteinDays < 4) out.push({ bad: true, text: `Protein hit on ${w.proteinDays} days. Mass gain is mostly food: aim for 5+.` })
  if (w.quranDays < 5) out.push({ bad: true, text: `Quran on ${w.quranDays}/7 days.` })
  else out.push({ bad: false, text: `Quran on ${w.quranDays}/7 days.` })
  if (w.frenchMin < 90) out.push({ bad: true, text: `French ${w.frenchMin} min. Target is 150.` })
  else out.push({ bad: false, text: `French ${w.frenchMin} min.` })
  if (w.fo.longest > 0 || prev.fo.longest > 0) {
    const up = w.fo.longest >= prev.fo.longest
    out.push({ bad: !up, text: `Longest focus block ${Math.round(w.fo.longest)} min (last week ${Math.round(prev.fo.longest)}).` })
  }
  if (extra.streak) {
    const { now, last } = extra.streak
    out.push({ bad: now < last, text: `Streak ${now} days (last week ${last}).` })
  }
  return out
}

const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const sets = (n: number) => `${fmt1(n)} set${n === 1 ? '' : 's'}`
export { fmt1 }

// ---------- reminders (Home) ----------

export function reminders(data: Data, today = localDate()): string[] {
  const out: string[] = []
  const hip = data.logs.filter((l) => l.type === 'stretch' && l.data.which === 'hip_flexors').map((l) => l.local_date).sort()
  const lastHip = hip.at(-1)
  const since = lastHip ? daysBetween(lastHip, today) : null
  if (since == null) out.push('Hip flexors: not logged yet')
  else if (since >= 3) out.push(`Hip flexors: ${since} days`)
  const wd = dow(today)
  const start = addDays(today, -((wd - 6 + 7) % 7))
  if ((wd === 4 || wd === 5) && !data.workouts.some((w) => w.day_code === 'C' && inWeek(w.local_date, start))) {
    out.push('No Day C this week yet')
  }
  const flags = data.logs.filter((l) => l.type === 'flag' && inWeek(l.local_date, start)).length
  if (flags >= 2) out.push(`Back tight ${flags}× this week`)
  return out
}

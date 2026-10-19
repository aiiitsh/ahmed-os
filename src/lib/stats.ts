import { EX, GOALS, GROUPS } from '../data/program'
import type { Data } from './store'
import type { Group, HabitEntry, Log, Workout, WorkoutSet, FocusBlock } from './types'
import { addDays, daysBetween, dow, inWeek, localDate, minutesBetween, weekDays } from './time'

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

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

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

/** `start`: the first clean day being counted (Settings → streak_start), used before any entries exist. */
export function habitStats(entries: HabitEntry[], today = localDate(), start?: string) {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const positives = sorted.filter((e) => e.count > 0).map((e) => e.entry_date)
  const firstEntry = sorted[0]?.entry_date
  const first = start && start <= today && (!firstEntry || start < firstEntry) ? start : firstEntry
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
    current, best, hasAny: sorted.length > 0 || !!first,
    pornDaysMonth: sorted.filter((e) => e.entry_date.startsWith(month) && e.count > 0 && e.porn).length,
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
  const focus = wk(data.focus, (f) => f.local_date)
  const byType = (t: string) => logs.filter((l) => l.type === t)

  const groups = groupSets(workouts, sets)
  const feelSets = sets.filter((s) => s.feel && !s.skipped)
  const hard = feelSets.filter((s) => s.feel === 'hard').length
  const quran = data.quran.filter((e) => inWeek(e.local_date, start))
  const french = byType('french')
  const frenchMin = french.reduce((a, l) => a + (l.data.minutes || 0), 0)

  const fo = focusStats(focus)
  const byDayCode = { A: 0, B: 0, C: 0 }
  for (const w of workouts) byDayCode[w.day_code]++

  const quranDays = new Set(quran.map((e) => e.local_date)).size
  const routineDays = new Set(byType('stretch').filter((l) => l.data.which === 'daily_routine').map((l) => l.local_date)).size
  // Ring = training, focus and the daily routine. Quran/French have no targets.
  const ring = [
    Math.min(1, workouts.length / GOALS.sessions),
    Math.min(1, fo.total / 60 / GOALS.focusHours),
    Math.min(1, routineDays / GOALS.routineDays),
  ]

  return {
    start, end: days[6], days,
    workouts, sets, byDayCode, groups,
    cardio: byType('cardio'),
    stretches: byType('stretch'),
    hipFlexor: byType('stretch').filter((l) => l.data.which === 'hip_flexors' || l.data.which === 'daily_routine').length,
    routineDays,
    swims: byType('cardio').filter((l) => l.data.sport === 'swim'),
    hikes: byType('cardio').filter((l) => l.data.sport === 'hike'),
    flags: byType('flag'),
    hardPct: feelSets.length ? hard / feelSets.length : 0,
    focus, fo,
    quran, quranDays,
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
  out.push(g.core < 14
    ? { bad: true, text: `Core got ${sets(g.core)}. Core is priority #1: aim for 14–24.` }
    : { bad: false, text: `Core got ${sets(g.core)}. On target.` })
  out.push(w.routineDays < 5
    ? { bad: true, text: `Daily core & posture routine on ${w.routineDays}/7 days. Aim for 5+.` }
    : { bad: false, text: `Daily core & posture routine on ${w.routineDays}/7 days.` })
  if (w.hipFlexor < 2) out.push({ bad: true, text: `Hip flexors stretched ${w.hipFlexor}×. At least 2× a week for APT.` })
  const longest = (xs: Log[]) => Math.max(0, ...xs.map((l) => Number(l.data.minutes) || 0))
  if (w.swims.length || prev.swims.length) {
    const a = longest(w.swims), b = longest(prev.swims)
    out.push({ bad: a < b, text: `Longest swim ${a} min (last week ${b}). ${w.swims.length} swim${w.swims.length === 1 ? '' : 's'}.` })
  }
  if (w.hardPct > 0.5) out.push({ bad: true, text: 'Lots of Hard. Hold weights next week / deload.' })
  if (w.flags.length >= 2) out.push({ bad: true, text: `Back felt tight ${w.flags.length} times. Check which days.` })
  // No targets for Quran/French: mention them only when they happened.
  if (w.quran.length) out.push({ bad: false, text: `Quran on ${w.quranDays} day${w.quranDays === 1 ? '' : 's'} (${w.quran.length} surah entries).` })
  if (w.frenchMin) out.push({ bad: false, text: `French ${w.frenchMin} min.` })
  if (w.hikes.length) out.push({ bad: false, text: `Hiked ${w.hikes.reduce((a, l) => a + (Number(l.data.km) || 0), 0)} km.` })
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
  const hip = data.logs.filter((l) => l.type === 'stretch' && (l.data.which === 'hip_flexors' || l.data.which === 'daily_routine')).map((l) => l.local_date).sort()
  const lastHip = hip.at(-1)
  const since = lastHip ? daysBetween(lastHip, today) : null
  if (since != null && since >= 3) out.push(`Hip flexors: ${since} days`)
  const wd = dow(today)
  const start = addDays(today, -((wd - 6 + 7) % 7))
  if ((wd === 4 || wd === 5) && !data.workouts.some((w) => w.day_code === 'C' && inWeek(w.local_date, start))) {
    out.push('No Day C this week yet')
  }
  const flags = data.logs.filter((l) => l.type === 'flag' && inWeek(l.local_date, start)).length
  if (flags >= 2) out.push(`Back tight ${flags}× this week`)
  return out
}

// ---------- focus coach (weekly suggestions) ----------

/**
 * Rule-based suggestions on how to focus more, from this week's focus blocks and what else you did
 * (training, swims, hikes). Compares focus on active days vs rest days, time of day, block length.
 */
export function focusCoach(w: WeekStats, prev: WeekStats): Insight[] {
  const out: Insight[] = []
  const blocks = w.focus.filter((b) => b.block_type === 'focus')
  if (!blocks.length) {
    out.push({ bad: true, text: 'No focus tracked this week. Start the timer once a day, even for 25 minutes; the trend only shows up with data.' })
    return out
  }
  const perDay = new Map<string, number>()
  for (const b of blocks) perDay.set(b.local_date, (perDay.get(b.local_date) ?? 0) + minutesBetween(b.started_at, b.ended_at))
  const activeDays = new Set([
    ...w.workouts.map((x) => x.local_date),
    ...w.swims.map((l) => l.local_date),
    ...w.hikes.map((l) => l.local_date),
  ])
  const act = [...perDay].filter(([d]) => activeDays.has(d)).map(([, m]) => m)
  const rest = [...perDay].filter(([d]) => !activeDays.has(d)).map(([, m]) => m)
  const a = mean(act), r = mean(rest)
  if (a != null && r != null) {
    if (a > r * 1.15) out.push({ bad: false, text: `You focus more on days you train or swim (${Math.round(a)} vs ${Math.round(r)} min). Move first, then do your deep work.` })
    else if (r > a * 1.15) out.push({ bad: true, text: `Training days cost you focus (${Math.round(a)} vs ${Math.round(r)} min on rest days). Try training after your main focus block.` })
  }
  // Time of day of the longest blocks.
  const hourOf = (iso: string) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)))
  const top = [...blocks].sort((x, y) => minutesBetween(y.started_at, y.ended_at) - minutesBetween(x.started_at, x.ended_at)).slice(0, 3)
  const hrs = top.map((b) => hourOf(b.started_at))
  const avgH = Math.round(hrs.reduce((p, h) => p + h, 0) / hrs.length)
  out.push({ bad: false, text: `Your best blocks start around ${String(avgH).padStart(2, '0')}:00. Protect that time: phone in another room.` })
  // Block length.
  const longest = w.fo.longest
  if (longest > 150 && w.fo.rest === 0) out.push({ bad: true, text: `Blocks up to ${Math.round(longest)} min with no breaks. Real focus usually fades after 60–90 min: take a 10 min break, then go again.` })
  if (w.fo.lost >= 3) out.push({ bad: true, text: `Lost focus ${w.fo.lost}× this week. Note what pulled you away; it's usually the phone.` })
  const tot = w.fo.total, ptot = prev.fo.total
  if (ptot > 0) out.push({ bad: tot < ptot, text: `Focus ${Math.round(tot / 60 * 10) / 10} h this week vs ${Math.round(ptot / 60 * 10) / 10} h last week.` })
  if (w.routineDays >= 4) out.push({ bad: false, text: 'The daily posture routine is a good focus primer: 6 minutes, then start the timer.' })
  return out
}

// Week summary for the review with Claude (plain text + JSON).
import { DAYS, EX, GROUPS, GOALS, STRETCH_LABEL, isSecs } from '../data/program'
import { surahLatin, surahName } from '../data/surahs'
import type { Data } from './store'
import { focusCoach, habitStats, insights, weekStats, type WeekStats } from './stats'
import { addDays, fmtDay, fmtDur, hhmm, localDate, minutesBetween } from './time'
import { describeLog } from './describe'
import { swimPlanFrom } from './plan'

export function weightChanges(data: Data, w: WeekStats) {
  const out: { key: string; name: string; from: string; to: string; dir: number }[] = []
  for (const key of new Set(w.sets.map((s) => s.exercise_key))) {
    const ex = EX[key]
    if (!ex || ex.kind === 'stretch') continue
    const rows = w.sets.filter((s) => s.exercise_key === key && !s.skipped)
    if (!rows.length) continue
    const order = (id: string) => w.workouts.find((x) => x.id === id)?.started_at ?? ''
    rows.sort((a, b) => order(a.workout_id).localeCompare(order(b.workout_id)))
    const first = rows[0], last = rows[rows.length - 1]
    const t = data.targets[key]
    const fmt = (wt: number | null, r: number | null) => (wt != null ? `${wt} lb × ${r}` : `${r}${isSecs(ex) ? ' s' : ''}`)
    const toW = last.next_weight_lb ?? t?.weight_lb ?? null
    const toR = last.next_reps ?? t?.reps ?? null
    const dw = (toW ?? 0) - (first.weight_lb ?? 0)
    const dr = (toR ?? 0) - (first.reps ?? 0)
    out.push({ key, name: ex.short, from: fmt(first.weight_lb, first.reps), to: fmt(toW, toR), dir: Math.sign(dw || dr) })
  }
  return out
}

export function streakCompare(data: Data, start: string) {
  const end = addDays(start, 6)
  const today = localDate()
  const nowRef = end < today ? end : today
  const prevEnd = addDays(start, -1)
  const s0 = data.appState?.settings?.streak_start
  return {
    now: habitStats(data.habits.filter((h) => h.entry_date <= nowRef), nowRef, s0).current,
    last: habitStats(data.habits.filter((h) => h.entry_date <= prevEnd), prevEnd, s0).current,
  }
}

export function buildWeek(data: Data, start: string) {
  const w = weekStats(data, start)
  const prev = weekStats(data, addDays(start, -7))
  const showStreak = !!data.appState?.settings?.show_streak_in_review
  const ins = insights(w, prev, showStreak ? { streak: streakCompare(data, start) } : {})
  return { w, prev, ins, coach: focusCoach(w, prev), changes: weightChanges(data, w) }
}

const workoutMinutes = (wo: { started_at: string; ended_at: string | null }) =>
  wo.ended_at ? Math.round(minutesBetween(wo.started_at, wo.ended_at)) : null

export function buildJson(data: Data, start: string) {
  const { w, ins, coach, changes } = buildWeek(data, start)
  const focusByDay = w.days.map((d) => {
    const bl = w.focus.filter((b) => b.local_date === d && b.block_type === 'focus')
    return { date: d, minutes: Math.round(bl.reduce((a, b) => a + minutesBetween(b.started_at, b.ended_at), 0)), blocks: bl.map((b) => ({ start: hhmm(b.started_at), min: Math.round(minutesBetween(b.started_at, b.ended_at)), end_reason: b.end_reason })) }
  })
  return {
    app: 'Ahmed OS',
    week_start: w.start, week_end: w.end, generated_at: new Date().toISOString(), timezone: 'America/Toronto', units: 'lb',
    training: {
      sessions: w.workouts.length, by_day: w.byDayCode,
      workouts: w.workouts.map((wo) => ({
        date: wo.local_date, day: wo.day_code, name: DAYS[wo.day_code].name, minutes: workoutMinutes(wo),
        skill: wo.skill_key, skill_done: wo.skill_done, skill_minutes: wo.skill_minutes, ended_early: wo.ended_early,
        sets: w.sets.filter((s) => s.workout_id === wo.id).sort((a, b) => a.position - b.position).map((s) => ({
          exercise: s.exercise_key, name: s.name_used, sets: s.sets, reps: s.reps, weight_lb: s.weight_lb, feel: s.feel,
          skipped: s.skipped, next_weight_lb: s.next_weight_lb, next_reps: s.next_reps,
        })),
      })),
      muscle_sets: Object.fromEntries(GROUPS.map((g) => [g.key, { sets: w.groups[g.key], target: [g.lo, g.hi] }])),
      hard_pct: Math.round(w.hardPct * 100),
      weight_changes: changes,
    },
    cardio: w.cardio.map((l) => ({ date: l.local_date, ...l.data })),
    swim_plan_next: swimPlanFrom(data),
    posture: {
      routine_days: w.routineDays,
      stretches: w.stretches.map((l) => ({ date: l.local_date, which: l.data.which })),
    },
    focus: {
      total_hours: +(w.fo.total / 60).toFixed(2), blocks: w.fo.blocks, longest_min: Math.round(w.fo.longest),
      average_min: Math.round(w.fo.average), rest_min: Math.round(w.fo.rest), lost_focus: w.fo.lost, target_hours: GOALS.focusHours,
      by_day: focusByDay,
    },
    quran: w.quran.map((e) => ({ date: e.local_date, surah: e.surah, name: surahName(e.surah), kind: e.kind })),
    french: { minutes: w.frenchMin, days: w.frenchDays, unit: data.appState?.french_unit, units_finished: w.unitsFinished },
    insights: ins.map((i) => ({ attention: i.bad, text: i.text })),
    focus_coach: coach.map((i) => i.text),
  }
}

export function buildText(data: Data, start: string): string {
  const { w, ins, coach, changes } = buildWeek(data, start)
  const L: string[] = []
  const h = (t: string) => L.push('', `## ${t}`)
  L.push(`AHMED OS · WEEK ${fmtDay(w.start)} → ${fmtDay(w.end)} (Sat–Fri, America/Toronto, weights in lb)`)
  L.push('Please review: weights to raise/lower, muscle balance, core and posture work, cardio (swims/hikes), and give me 3 concrete tips to focus longer next week based on my training.')

  h('Insights (app rules)')
  for (const i of ins) L.push(`${i.bad ? '[!]' : '[ok]'} ${i.text}`)

  h('Training')
  L.push(`Sessions: ${w.workouts.length} (A ${w.byDayCode.A}, B ${w.byDayCode.B}, C ${w.byDayCode.C}). Hard feels: ${Math.round(w.hardPct * 100)}% of sets.`)
  L.push('Muscle sets vs target: ' + GROUPS.map((g) => `${g.label} ${w.groups[g.key]} (${g.lo}–${g.hi})`).join(', '))
  for (const wo of w.workouts) {
    L.push('', `${fmtDay(wo.local_date)} · Day ${wo.day_code} ${DAYS[wo.day_code].name} · ${workoutMinutes(wo) ?? '?'} min${wo.ended_early ? ' · ended early' : ''}`)
    if (wo.skill_key) L.push(`  - Thenx ${wo.skill_key}: ${wo.skill_done ? `done (${wo.skill_minutes ?? '?'} min)` : 'skipped'}`)
    for (const s of w.sets.filter((x) => x.workout_id === wo.id).sort((a, b) => a.position - b.position)) {
      const ex = EX[s.exercise_key]
      if (s.skipped) { L.push(`  - ${s.name_used}: skipped`); continue }
      if (ex?.kind === 'stretch') { L.push(`  - ${s.name_used}: done`); continue }
      const unit = ex && isSecs(ex) ? 's' : ''
      const load = s.weight_lb != null ? ` @ ${s.weight_lb} lb` : ''
      const next = s.next_reps != null ? ` → next ${s.next_weight_lb != null ? `${s.next_weight_lb} lb × ` : ''}${s.next_reps}${unit}` : ''
      L.push(`  - ${s.name_used}: ${s.sets}×${s.reps}${unit}${load} · ${s.feel?.toUpperCase() ?? '-'}${next}`)
    }
  }
  if (changes.length) {
    L.push('', 'Target changes this week:')
    for (const c of changes) L.push(`  - ${c.name}: ${c.from} → ${c.to}${c.dir > 0 ? ' ↑' : c.dir < 0 ? ' ↓' : ''}`)
  }

  h('Cardio & posture')
  const sp = swimPlanFrom(data)
  L.push(`Next swim: 25 m sprints belly/back, rest ${sp.rest_s} s, aim ${sp.target_min} min.`)
  L.push(w.cardio.length ? w.cardio.map((l) => `${fmtDay(l.local_date)} ${describeLog(l).text}`).join('\n') : 'No cardio logged.')
  L.push(`Daily core & posture routine: ${w.routineDays}/7 days. Other stretches: ${w.stretches.filter((l) => l.data.which !== 'daily_routine').map((l) => STRETCH_LABEL[l.data.which] ?? l.data.which).join(', ') || 'none'}.`)

  h('Focus')
  L.push(`Total ${fmtDur(w.fo.total)} (target ${GOALS.focusHours} h) · ${w.fo.blocks} blocks · longest ${Math.round(w.fo.longest)} min · avg ${Math.round(w.fo.average)} min · breaks ${fmtDur(w.fo.rest)} · lost focus ${w.fo.lost}×`)
  for (const d of w.days) {
    const bl = w.focus.filter((b) => b.local_date === d && b.block_type === 'focus')
    if (!bl.length) continue
    const active = [
      w.workouts.some((x) => x.local_date === d) && 'trained',
      w.swims.some((x) => x.local_date === d) && 'swam',
      w.hikes.some((x) => x.local_date === d) && 'hiked',
    ].filter(Boolean).join(', ')
    L.push(`  - ${fmtDay(d)}: ${bl.map((b) => `${hhmm(b.started_at)} ${Math.round(minutesBetween(b.started_at, b.ended_at))}m`).join(', ')}${active ? ` (${active})` : ''}`)
  }
  if (coach.length) { L.push('App suggestions:'); for (const c of coach) L.push(`  - ${c.text}`) }

  h('Quran & French (no targets)')
  L.push(w.quran.length ? w.quran.map((e) => `${fmtDay(e.local_date)} ${e.kind} ${surahLatin(e.surah)} (${e.surah})`).join('\n') : 'No Quran entries.')
  L.push(w.frenchMin ? `French: ${w.frenchMin} min on ${w.frenchDays} days.` : 'No French logged.')
  return L.join('\n')
}

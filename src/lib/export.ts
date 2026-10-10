// Section 9.5: week summary for the Friday review with Claude (plain text + JSON).
import { DAYS, EX, GROUPS, GOALS, STRETCH_LABEL } from '../data/program'
import type { Data } from './store'
import { habitStats, insights, weekStats, fmt1, type WeekStats } from './stats'
import { addDays, fmtClock, fmtDay, fmtDur, hhmm, localDate } from './time'
import { describeLog } from './describe'

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
    const fmt = (wt: number | null, r: number | null) => (wt != null ? `${wt} kg × ${r}` : `${r}${ex.kind === 'timed' ? ' s' : ''}`)
    const toW = last.next_weight_kg ?? t?.weight_kg ?? null
    const toR = last.next_reps ?? t?.reps ?? null
    const dw = (toW ?? 0) - (first.weight_kg ?? 0)
    const dr = (toR ?? 0) - (first.reps ?? 0)
    out.push({ key, name: ex.short, from: fmt(first.weight_kg, first.reps), to: fmt(toW, toR), dir: Math.sign(dw || dr) })
  }
  return out
}

export function streakCompare(data: Data, start: string) {
  const end = addDays(start, 6)
  const today = localDate()
  const nowRef = end < today ? end : today
  const prevEnd = addDays(start, -1)
  return {
    now: habitStats(data.habits.filter((h) => h.entry_date <= nowRef), nowRef).current,
    last: habitStats(data.habits.filter((h) => h.entry_date <= prevEnd), prevEnd).current,
  }
}

export function buildWeek(data: Data, start: string) {
  const w = weekStats(data, start)
  const prev = weekStats(data, addDays(start, -7))
  const showStreak = !!data.appState?.settings?.show_streak_in_review
  const ins = insights(w, prev, showStreak ? { streak: streakCompare(data, start) } : {})
  return { w, prev, ins, changes: weightChanges(data, w) }
}

export function buildJson(data: Data, start: string) {
  const { w, ins, changes } = buildWeek(data, start)
  return {
    app: 'Ahmed OS',
    week_start: w.start, week_end: w.end, generated_at: new Date().toISOString(), timezone: 'America/Toronto',
    training: {
      sessions: w.workouts.length, by_day: w.byDayCode,
      workouts: w.workouts.map((wo) => ({
        date: wo.local_date, day: wo.day_code, name: DAYS[wo.day_code].name,
        minutes: wo.ended_at ? Math.round((new Date(wo.ended_at).getTime() - new Date(wo.started_at).getTime()) / 60000) : null,
        skill: wo.skill_key, skill_done: wo.skill_done, skill_minutes: wo.skill_minutes, ended_early: wo.ended_early,
        sets: w.sets.filter((s) => s.workout_id === wo.id).sort((a, b) => a.position - b.position).map((s) => ({
          exercise: s.exercise_key, name: s.name_used, sets: s.sets, reps: s.reps, weight_kg: s.weight_kg, feel: s.feel,
          skipped: s.skipped, next_weight_kg: s.next_weight_kg, next_reps: s.next_reps,
        })),
      })),
      muscle_sets: Object.fromEntries(GROUPS.map((g) => [g.key, { sets: w.groups[g.key], target: [g.lo, g.hi] }])),
      hard_pct: Math.round(w.hardPct * 100),
      weight_changes: changes,
      skills: data.appState?.skills,
    },
    cardio: w.cardio.map((l) => ({ date: l.local_date, ...l.data })),
    posture: {
      stretches: w.stretches.map((l) => ({ date: l.local_date, which: l.data.which })),
      hip_flexor_count: w.hipFlexor,
      lower_back_flags: w.flags.map((l) => ({ date: l.local_date, time: hhmm(l.logged_at) })),
    },
    nutrition: { protein_days: w.proteinDays, bodyweight_kg: w.bodyweight.last, bodyweight_prev_kg: w.bodyweight.before },
    sleep: {
      nights: w.sleep.map((s) => ({ wake_date: s.wake_date, bed: s.bed_at ? hhmm(s.bed_at) : null, wake: s.wake_at ? hhmm(s.wake_at) : null, minutes: s.minutes })),
      avg_hours: w.sl.avgMinutes != null ? +(w.sl.avgMinutes / 60).toFixed(2) : null,
      avg_bed: w.sl.avgBed != null ? fmtClock(w.sl.avgBed) : null,
      avg_wake: w.sl.avgWake != null ? fmtClock(w.sl.avgWake) : null,
      bedtime_sd_min: w.sl.bedSpread != null ? Math.round(w.sl.bedSpread) : null,
    },
    focus: {
      total_hours: +(w.fo.total / 60).toFixed(2), blocks: w.fo.blocks, longest_min: Math.round(w.fo.longest),
      average_min: Math.round(w.fo.average), rest_min: Math.round(w.fo.rest), lost_focus: w.fo.lost, target_hours: GOALS.focusHours,
    },
    learn: {
      quran_days: w.quranDays, juz_revised: w.juzRevised,
      quran: data.logs.filter((l) => l.type === 'quran' && l.local_date >= w.start && l.local_date <= w.end).map((l) => ({ date: l.local_date, ...l.data })),
      french_minutes: w.frenchMin, french_days: w.frenchDays, french_unit: data.appState?.french_unit, units_finished: w.unitsFinished,
    },
    insights: ins.map((i) => ({ attention: i.bad, text: i.text })),
  }
}

export function buildText(data: Data, start: string): string {
  const { w, ins, changes } = buildWeek(data, start)
  const L: string[] = []
  const h = (t: string) => L.push('', `## ${t}`)
  L.push(`AHMED OS · WEEK ${fmtDay(w.start)} → ${fmtDay(w.end)} (Sat–Fri, America/Toronto)`)
  L.push('Please review: weights to raise/lower, push/pull and muscle balance, missed days and posture work, sleep patterns (and Hard days vs short sleep), lower-back flags, focus trend, Quran/French consistency.')

  h('Insights (app rules)')
  for (const i of ins) L.push(`${i.bad ? '[!]' : '[ok]'} ${i.text}`)

  h('Training')
  L.push(`Sessions: ${w.workouts.length} (A ${w.byDayCode.A}, B ${w.byDayCode.B}, C ${w.byDayCode.C}). Hard feels: ${Math.round(w.hardPct * 100)}% of sets.`)
  L.push('Muscle sets vs target: ' + GROUPS.map((g) => `${g.label} ${fmt1(w.groups[g.key])} (${g.lo}–${g.hi})`).join(', '))
  for (const wo of w.workouts) {
    const mins = wo.ended_at ? Math.round((new Date(wo.ended_at).getTime() - new Date(wo.started_at).getTime()) / 60000) : 0
    L.push(``, `${fmtDay(wo.local_date)} · Day ${wo.day_code} ${DAYS[wo.day_code].name} · ${mins} min${wo.ended_early ? ' · ended early' : ''}`)
    if (wo.skill_key) L.push(`  - Thenx ${wo.skill_key}: ${wo.skill_done ? `done (${wo.skill_minutes ?? '?'} min)` : 'skipped'}`)
    for (const s of w.sets.filter((x) => x.workout_id === wo.id).sort((a, b) => a.position - b.position)) {
      const ex = EX[s.exercise_key]
      if (s.skipped) { L.push(`  - ${s.name_used}: skipped`); continue }
      if (ex?.kind === 'stretch') { L.push(`  - ${s.name_used}: done`); continue }
      const unit = ex?.kind === 'timed' ? 's' : ''
      const load = s.weight_kg != null ? ` @ ${s.weight_kg} kg` : ''
      const next = s.next_reps != null ? ` → next ${s.next_weight_kg != null ? `${s.next_weight_kg} kg × ` : ''}${s.next_reps}${unit}` : ''
      L.push(`  - ${s.name_used}: ${s.sets}×${s.reps}${unit}${load} · ${s.feel?.toUpperCase() ?? '-'}${next}`)
    }
  }
  if (changes.length) {
    L.push('', 'Target changes this week:')
    for (const c of changes) L.push(`  - ${c.name}: ${c.from} → ${c.to}${c.dir > 0 ? ' ↑' : c.dir < 0 ? ' ↓' : ''}`)
  }
  const sk = data.appState?.skills ?? {}
  L.push('', 'Skills: ' + Object.values(sk).filter((s) => s.active).map((s) => `${s.name} Lvl ${s.level} ${s.level_name} ${s.pct}%`).join('; '))

  h('Cardio & posture')
  L.push(w.cardio.length ? w.cardio.map((l) => `${fmtDay(l.local_date)} ${describeLog(l).text}`).join('\n') : 'No cardio logged.')
  L.push(`Stretches: ${w.stretches.length} (${w.stretches.map((l) => STRETCH_LABEL[l.data.which] ?? l.data.which).join(', ') || 'none'}). Hip flexors: ${w.hipFlexor}×.`)
  L.push(`Lower back felt tight: ${w.flags.length}×${w.flags.length ? ` (${w.flags.map((l) => fmtDay(l.local_date)).join(', ')})` : ''}.`)
  L.push(`Protein hit days: ${w.proteinDays}/7.`)
  L.push(`Bodyweight: ${w.bodyweight.last != null ? `${w.bodyweight.last} kg` : 'not logged'}${w.bodyweight.before != null ? ` (previous ${w.bodyweight.before} kg)` : ''}.`)

  h('Sleep')
  L.push(`Avg ${w.sl.avgMinutes != null ? fmtDur(w.sl.avgMinutes) : '—'} · bed ${w.sl.avgBed != null ? fmtClock(w.sl.avgBed) : '—'} · wake ${w.sl.avgWake != null ? fmtClock(w.sl.avgWake) : '—'} · bedtime spread ${w.sl.bedSpread != null ? Math.round(w.sl.bedSpread) + ' min' : '—'} (target 7.5–8.5 h, spread < 60)`)
  for (const s of w.sleep) L.push(`  - ${fmtDay(s.wake_date)}: bed ${s.bed_at ? hhmm(s.bed_at) : '?'} → wake ${s.wake_at ? hhmm(s.wake_at) : '?'} (${s.minutes != null ? fmtDur(s.minutes) : '?'})`)

  h('Focus')
  L.push(`Total ${fmtDur(w.fo.total)} (target ${GOALS.focusHours} h) · ${w.fo.blocks} blocks · longest ${Math.round(w.fo.longest)} min · avg ${Math.round(w.fo.average)} min · rest ${fmtDur(w.fo.rest)} · lost focus ${w.fo.lost}×`)

  h('Learn')
  L.push(`Quran: ${w.quranDays}/7 days, ${w.juzRevised} juz revised.`)
  L.push(`French (${data.appState?.settings?.french_level ?? 'A1'}, unit ${data.appState?.french_unit}): ${w.frenchMin} min on ${w.frenchDays} days, ${w.unitsFinished} unit(s) finished.`)
  return L.join('\n')
}

// Week and month summaries for the review with Claude (plain text + JSON).
import { DAYS, EX, GROUPS, GOALS, STRETCH_LABEL, isSecs } from '../data/program'
import { surahLatin, surahName } from '../data/surahs'
import type { Data } from './store'
import { focusCoach, habitStats, insights, weekStats, type WeekStats } from './stats'
import { addDays, daysBetween, fmtDay, fmtDur, hhmm, localDate, minutesBetween, weekStart } from './time'
import { describeLog } from './describe'
import { proteinGoal, swimTarget } from './plan'
import { WEEKDAYS, planFor, slotStatus, slotText, unplanned } from './weekplan'
import { doneBetween, dueLabel, isOpen, sortTasks } from './tasks'
import { byCategory, byWhat, tagOf } from './focustags'
import { lifeText } from './life'
import { amountSummary, quranStreak } from './qurandaily'

export function weightChanges(data: Data, w: Pick<WeekStats, 'sets' | 'workouts'>) {
  const out: { key: string; name: string; from: string; to: string; dir: number }[] = []
  for (const key of new Set(w.sets.map((s) => s.exercise_key))) {
    const ex = EX[key]
    if (!ex || ex.kind === 'stretch' || ex.kind === 'prep' || ex.kind === 'skill') continue
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
    const from = fmt(first.weight_lb, first.reps), to = fmt(toW, toR)
    if (from !== to) out.push({ key, name: ex.short, from, to, dir: Math.sign(dw || dr) })
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
  const st = data.appState?.settings
  const focusByDay = w.days.map((d) => {
    const bl = w.focus.filter((b) => b.local_date === d && b.block_type === 'focus')
    return { date: d, minutes: Math.round(bl.reduce((a, b) => a + minutesBetween(b.started_at, b.ended_at), 0)), blocks: bl.map((b) => ({ start: hhmm(b.started_at), min: Math.round(minutesBetween(b.started_at, b.ended_at)), end_reason: b.end_reason, category: tagOf(st, b.id).cat ?? null, what: tagOf(st, b.id).what ?? null })) }
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
    swim_next_m: swimTarget(data),
    posture: {
      routine_days: w.routineDays, protein_days: w.proteinDays, protein_avg_g: w.proteinAvg,
      stretches: w.stretches.map((l) => ({ date: l.local_date, which: l.data.which })),
    },
    focus: {
      total_hours: +(w.fo.total / 60).toFixed(2), blocks: w.fo.blocks, longest_min: Math.round(w.fo.longest),
      average_min: Math.round(w.fo.average), rest_min: Math.round(w.fo.rest), lost_focus: w.fo.lost, target_hours: GOALS.focusHours,
      by_day: focusByDay,
      by_category: Object.fromEntries(byCategory(w.focus, st).map((c) => [c.name, Math.round(c.min)])),
    },
    quran: w.quran.map((e) => ({ date: e.local_date, surah: e.surah, name: surahName(e.surah), kind: e.kind })),
    quran_checkin: { days: w.quranCheckinDays, entries: w.quranCheckins.map((l) => ({ date: l.local_date, amount: l.data.amount })) },
    plan_read_saturday: w.planRead,
    french: { minutes: w.frenchMin, days: w.frenchDays, unit: data.appState?.french_unit, units_finished: w.unitsFinished },
    insights: ins.map((i) => ({ attention: i.bad, text: i.text })),
    focus_coach: coach.map((i) => i.text),
  }
}

export function buildText(data: Data, start: string): string {
  const { w, ins, coach, changes } = buildWeek(data, start)
  const L: string[] = []
  const h = (t: string) => L.push('', `## ${t}`)
  L.push(`AHMED OS · WEEK ${fmtDay(w.start)} → ${fmtDay(w.end)} (Mon–Sun, America/Toronto, weights in lb)`)
  L.push('Please review: weights to raise/lower, muscle balance, core and posture work, cardio (swims/hikes), and give me 3 concrete tips to focus longer next week based on my training.')

  h('Insights (app rules)')
  for (const i of ins) L.push(`${i.bad ? '[!]' : '[ok]'} ${i.text}`)

  h('Training')
  L.push(`Sessions: ${w.workouts.length} (A ${w.byDayCode.A}, B ${w.byDayCode.B}, C ${w.byDayCode.C}, D ${w.byDayCode.D}). Hard feels: ${Math.round(w.hardPct * 100)}% of sets.`)
  L.push('Muscle sets vs target: ' + GROUPS.map((g) => `${g.label} ${w.groups[g.key]} (${g.lo}–${g.hi})`).join(', '))
  for (const wo of w.workouts) {
    L.push('', `${fmtDay(wo.local_date)} · Day ${wo.day_code} ${DAYS[wo.day_code].name} · ${workoutMinutes(wo) ?? '?'} min${wo.ended_early ? ' · ended early' : ''}`)
    if (wo.skill_key) L.push(`  - Thenx ${wo.skill_key}: ${wo.skill_done ? `done (${wo.skill_minutes ?? '?'} min)` : 'skipped'}`)
    for (const s of w.sets.filter((x) => x.workout_id === wo.id).sort((a, b) => a.position - b.position)) {
      const ex = EX[s.exercise_key]
      if (s.skipped) { L.push(`  - ${s.name_used}: skipped`); continue }
      if (ex?.kind === 'stretch' || ex?.kind === 'prep') { L.push(`  - ${s.name_used}: done`); continue }
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
  L.push(`Next swim: ${swimTarget(data)} m slow (technique, no sprints).`)
  L.push(`Protein: ${w.proteinGoal} g reached on ${w.proteinDays}/7 days, average ${w.proteinAvg} g on tracked days.`)
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

  h('Quran daily check-in')
  L.push(`Done on ${w.quranCheckinDays}/7 days${w.quranCheckins.length ? `: ${amountSummary(w.quranCheckins)}` : ''}. Streak now: ${quranStreak(data.logs)} days.`)
  L.push(`Saturday "Read my full plan": ${w.planRead}.`)

  h('Quran surahs & French (no targets)')
  L.push(w.quran.length ? w.quran.map((e) => `${fmtDay(e.local_date)} ${e.kind} ${surahLatin(e.surah)} (${e.surah})`).join('\n') : 'No surah entries.')
  L.push(w.frenchMin ? `French: ${w.frenchMin} min on ${w.frenchDays} days.` : 'No French logged.')
  return L.join('\n')
}

// ---------- month: 4 full weeks side by side, plus this week so far ----------

const r1 = (n: number) => Math.round(n * 10) / 10
const km = (w: WeekStats) => w.hikes.reduce((a, l) => a + (Number(l.data.km) || 0), 0)
const cardioMin = (w: WeekStats) => w.cardio.filter((l) => l.data.sport !== 'hike').reduce((a, l) => a + (Number(l.data.minutes) || 0), 0)

/** One line per workout: what was done and how it felt. */
function workoutLine(w: WeekStats, wo: WeekStats['workouts'][number]) {
  const parts: string[] = []
  if (wo.skill_key) parts.push(`Thenx ${wo.skill_key} ${wo.skill_done ? `${wo.skill_minutes ?? '?'} min` : 'skipped'}`)
  for (const s of w.sets.filter((x) => x.workout_id === wo.id).sort((a, b) => a.position - b.position)) {
    const ex = EX[s.exercise_key]
    if (!ex || ex.kind === 'prep' || ex.kind === 'stretch') continue
    if (s.skipped) { parts.push(`${ex.short} skipped`); continue }
    const unit = isSecs(ex) ? 's' : ''
    parts.push(`${ex.short} ${s.sets}×${s.reps}${unit}${s.weight_lb != null ? ` @${s.weight_lb}` : ''}${s.feel ? ` ${s.feel}` : ''}`)
  }
  const min = workoutMinutes(wo)
  return `  - ${fmtDay(wo.local_date)} Day ${wo.day_code} · ${min ?? '?'} min${wo.ended_early ? ' · ended early' : ''}: ${parts.join('; ') || 'no sets saved'}`
}

export function buildMonthText(data: Data, today = localDate()): string {
  const cur = weekStart(today)
  const starts = [4, 3, 2, 1].map((k) => addDays(cur, -7 * k)) // full weeks, oldest first
  const W = starts.map((s) => weekStats(data, s))
  const now = weekStats(data, cur)
  const soFar = daysBetween(cur, today) + 1
  const last = W[3]
  const settings = data.appState?.settings
  const before = W.slice(0, 3)
  const L: string[] = []
  const h = (t: string) => L.push('', `## ${t}`)

  L.push(`AHMED OS · MONTH ${fmtDay(starts[0])} → ${fmtDay(addDays(cur, -1))} + this week so far (Mon–Sun weeks, America/Toronto, weights in lb)`)
  L.push('Please compare my last full week with the weeks before it, point out trends (good and bad), and help me plan the coming week Mon–Sun: gym days (A/C/B/D), swim and rest, weights to raise or lower, APT/posture work (no glute growth), 3 concrete tips to focus longer, and how my focus time splits across categories (Afflo, Study, Planning, Farq…) and what to shift to be more productive.')
  L.push(`Program: Mon A = pull + arms (muscle-up), Tue C = legs, core + knees, Thu B = push + arms (planche), Sat D = size day, Sun slow swim, Wed/Fri rest. Goals: 4 sessions, arms 12–20 sets, protein ${proteinGoal(data)} g on 5+ days, focus 15 h.`)

  // Week by week table
  h('Week by week (oldest → newest)')
  const row = (label: string, w: WeekStats) => [
    label,
    `${w.workouts.length} (A${w.byDayCode.A} B${w.byDayCode.B} C${w.byDayCode.C} D${w.byDayCode.D})`,
    `${Math.round(w.hardPct * 100)}%`,
    fmt(w.groups.arms), fmt(w.groups.core), `${fmt(w.groups.pull)}/${fmt(w.groups.push)}`, fmt(w.groups.posterior),
    `${w.cardio.length}${w.cardio.length ? ` (${[cardioMin(w) && `${cardioMin(w)} min`, km(w) && `${km(w)} km`].filter(Boolean).join(', ')})` : ''}`,
    `${w.proteinDays}/7`,
    fmtDur(w.fo.total), `${Math.round(w.fo.longest)}m`, `${w.fo.lost}`,
    `${w.quranCheckinDays}/7`,
    `${w.quran.length}`,
    w.planRead,
  ].join(' | ')
  L.push('Week | Gym | Hard | Arms | Core | Pull/Push | Legs | Cardio | Protein days | Focus | Longest | Lost focus | Quran days | Surah entries | Plan read (Sat)')
  L.push('--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---')
  W.forEach((w, i) => L.push(row(`${fmtDay(w.start)}${i === 3 ? ' (last full)' : ''}`, w)))
  L.push(row(`${fmtDay(cur)} so far (${soFar}/7 days)`, now))

  // Last full week vs the 3 before
  h('Last full week vs the 3 before')
  const avg = (f: (w: WeekStats) => number) => before.reduce((a, w) => a + f(w), 0) / before.length
  const cmp = (label: string, f: (w: WeekStats) => number, unit = '', higherIsBetter = true) => {
    const v = f(last), a = avg(f)
    const d = v - a
    const tag = Math.abs(d) < 0.05 * Math.max(1, a) ? 'same' : (d > 0) === higherIsBetter ? 'better' : 'worse'
    L.push(`- ${label}: ${r1(v)}${unit} vs avg ${r1(a)}${unit} → ${tag}`)
  }
  cmp('Gym sessions', (w) => w.workouts.length)
  cmp('Arms sets', (w) => w.groups.arms)
  cmp('Core sets', (w) => w.groups.core)
  cmp('Pull sets', (w) => w.groups.pull)
  cmp('Hard sets', (w) => w.hardPct * 100, '%', false)
  cmp('Cardio sessions', (w) => w.cardio.length)
  cmp('Protein days', (w) => w.proteinDays)
  cmp('Focus hours', (w) => w.fo.total / 60, ' h')
  cmp('Longest focus block', (w) => w.fo.longest, ' min')
  cmp('Lost focus', (w) => w.fo.lost, '×', false)
  if (data.appState?.settings?.show_streak_in_review) {
    const st = habitStats(data.habits, today, data.appState?.settings?.streak_start)
    L.push(`- Streak: ${st.current} days now · last 4 weeks: ${st.cleanDays}/${st.days} clean days, ${r1(st.avgPerWeek)} per week (${st.perWeek.join(' · ')})`)
  }

  // Plan vs what happened
  const planned = [...starts, cur].filter((s) => planFor(data, s))
  if (planned.length) {
    h('Weekly plan vs what happened (✓ done, ✗ missed, + unplanned)')
    for (const s of planned) {
      const p = planFor(data, s)!
      const cells = p.days.map((slot, i) => {
        const d = addDays(s, i)
        if (d > today) return `${WEEKDAYS[i]} ${slotText(slot)}`
        const st = slotStatus(data, d, slot, today)
        const extra = unplanned(data, d, slot)
        return `${WEEKDAYS[i]} ${slotText(slot)} ${st === 'done' ? '✓' : st === 'missed' ? '✗' : '…'}${extra.length ? ` +${extra.join('+')}` : ''}`
      })
      L.push(`- Week of ${fmtDay(s)}: ${cells.join(' · ')}`)
    }
  }
  const nextPlan = planFor(data, addDays(cur, 7))
  if (nextPlan) L.push(`- Next week (draft): ${nextPlan.days.map((slot, i) => `${WEEKDAYS[i]} ${slotText(slot)}`).join(' · ')}`)

  // App rules on the last full week
  h(`App insights · last full week (${fmtDay(last.start)})`)
  for (const i of insights(last, W[2])) L.push(`${i.bad ? '[!]' : '[ok]'} ${i.text}`)

  // Training detail
  h('Workouts')
  for (const w of [...W, now]) {
    if (!w.workouts.length) { L.push(`Week of ${fmtDay(w.start)}: no gym`); continue }
    L.push(`Week of ${fmtDay(w.start)}:`)
    for (const wo of [...w.workouts].sort((x, y) => x.started_at.localeCompare(y.started_at))) L.push(workoutLine(w, wo))
  }
  const all = { sets: [...W, now].flatMap((w) => w.sets), workouts: [...W, now].flatMap((w) => w.workouts) }
  const changes = weightChanges(data, all)
  if (changes.length) {
    L.push('', 'Targets over the month (first → now):')
    for (const c of changes) L.push(`  - ${c.name}: ${c.from} → ${c.to}${c.dir > 0 ? ' ↑' : c.dir < 0 ? ' ↓' : ''}`)
  }

  // Cardio
  h('Swim, cardio & protein')
  L.push(`Next swim: ${swimTarget(data)} m slow (technique, no sprints).`)
  const cardio = [...W, now].flatMap((w) => w.cardio).sort((x, y) => x.logged_at.localeCompare(y.logged_at))
  L.push(cardio.length ? cardio.map((l) => `- ${fmtDay(l.local_date)} ${describeLog(l).text}`).join('\n') : 'No cardio logged.')
  L.push(`Protein days per week: ${[...W, now].map((w) => w.proteinDays).join(' · ')} (last = this week so far).`)

  // Focus
  h('Focus')
  for (const w of [...W, now]) {
    const byDay = w.days.map((d) => w.focus.filter((b) => b.local_date === d && b.block_type === 'focus').reduce((a, b) => a + minutesBetween(b.started_at, b.ended_at), 0))
    L.push(`- Week of ${fmtDay(w.start)}: ${fmtDur(w.fo.total)} · ${w.fo.blocks} blocks · longest ${Math.round(w.fo.longest)}m · avg ${Math.round(w.fo.average)}m · lost ${w.fo.lost}× · by day ${byDay.map((m) => Math.round(m)).join('/')} min`)
    const cats = byCategory(w.focus, settings)
    if (cats.length) L.push(`  by category: ${cats.map((c) => `${c.name} ${fmtDur(c.min)}`).join(' · ')}`)
  }
  const monthFocus = [...W, now].flatMap((w) => w.focus)
  const things = byWhat(monthFocus, settings).slice(0, 10)
  if (things.length) L.push(`Most time on (5 weeks): ${things.map((t) => `${t.name} ${fmtDur(t.min)}`).join(' · ')}`)
  const coach = focusCoach(last, W[2])
  if (coach.length) { L.push('App suggestions (last full week):'); for (const c of coach) L.push(`  - ${c.text}`) }

  // Tasks
  const tasks = data.appState?.settings?.tasks ?? []
  if (tasks.length) {
    h('Tasks')
    L.push(`Done per week: ${[...W, now].map((w) => doneBetween(tasks, w.start, w.end).length).join(' · ')} (last = this week so far)`)
    const open = sortTasks(tasks.filter(isOpen))
    const late = open.filter((t) => t.due && t.due < today)
    L.push(`Open: ${open.length}${late.length ? ` · ${late.length} late` : ''}`)
    for (const t of open.slice(0, 20)) L.push(`  - ${t.title}${t.due ? ` (${dueLabel(t.due, today)})` : ''}`)
  }

  // Learn
  h('Quran & French (no targets)')
  const quran = [...W, now].flatMap((w) => w.quran).sort((x, y) => x.at.localeCompare(y.at))
  L.push(quran.length ? quran.map((e) => `- ${fmtDay(e.local_date)} ${e.kind} ${surahLatin(e.surah)} (${e.surah})`).join('\n') : 'No Quran entries.')
  const fr = [...W, now].reduce((a, w) => a + w.frenchMin, 0)
  L.push(fr ? `French: ${fr} min over the month.` : 'No French logged.')

  const life = data.appState?.settings?.life_plan
  if (life?.steps.length) {
    h('Life plan')
    L.push(...lifeText(life, today))
  }
  return L.join('\n')
}

const fmt = (n: number) => String(r1(n))

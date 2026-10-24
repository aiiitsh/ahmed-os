// Every user action. Each one updates local state, writes, and (where it makes sense) offers Undo.
import { get, newId, patchApp, putRows, putTarget, removeRow, set, uid } from './store'
import { toast } from './toast'
import { addDays, localDate, minutesBetween, nowIso, fmtDur } from './time'
import { CARDIO, DAYS, EX, isSecs, nextDay, type Sport } from '../data/program'
import { nextSwim, progress, type SwimDone } from './progression'
import { restAfterSet, restBetween, unlockAudio } from './rest'
import { surahLatin } from '../data/surahs'
import { swimPlanFrom } from './plan'
import type { ActiveSession, DayCode, Feel, FocusBlock, HabitEntry, Log, LogType, PlanSlot, QuranEvent, StepState, Target, Task, WeekPlan, Workout, WorkoutSet } from './types'

// ---------- generic logs ----------

export function addLog(type: LogType, data: Record<string, any>, label: string, at = nowIso()): Log {
  const log: Log = { id: newId(), user_id: uid(), logged_at: at, local_date: localDate(at), type, data }
  putRows('logs', [log])
  toast(label, () => removeRow('logs', log.id))
  return log
}

/** When something was done: today, or N days ago (entered after the fact). */
const agoIso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()

export const logCardio = (sport: Sport, variant: string, minutes: number, daysAgo = 0) => {
  const v = CARDIO[sport].variants.find((x) => x[0] === variant)?.[1] ?? variant
  addLog('cardio', { sport, variant, minutes }, `${CARDIO[sport].label} · ${v} · ${minutes} min`, agoIso(daysAgo))
}

export const logHike = (km: number, minutes: number, daysAgo = 0) =>
  addLog('cardio', { sport: 'hike', variant: 'hike', km, minutes }, `Hike · ${km} km · ${fmtDur(minutes)}`, agoIso(daysAgo))

export function deleteEntry(kind: 'logs' | 'workouts' | 'focus' | 'quran', id: string) {
  removeRow(kind, id)
  toast('Deleted')
}

/** Delete a past workout (and its sets) from history, with Undo. */
export function deleteWorkout(id: string) {
  const w = get().workouts.find((x) => x.id === id)
  const sets = get().sets.filter((x) => x.workout_id === id)
  removeRow('workouts', id)
  toast('Workout deleted', w ? () => { putRows('workouts', [w]); putRows('sets', sets) } : undefined)
}

// ---------- swim ----------

export function swimPlan() {
  return swimPlanFrom(get())
}

/** Manual swim entry (done after the session); sets the next rest time and target. */
export function logSwim(done: SwimDone, daysAgo = 0) {
  const app = get().appState
  if (!app) return
  const at = agoIso(daysAgo)
  const prevSettings = app.settings
  const cur = swimPlan()
  const next = nextSwim(cur, done)
  const log: Log = {
    id: newId(), user_id: app.user_id, logged_at: at, local_date: localDate(at), type: 'cardio',
    data: { sport: 'swim', variant: 'sprints', minutes: done.minutes, intensity: done.intensity, rest_s: done.rest_s, target_min: cur.target_min },
  }
  putRows('logs', [log])
  patchApp({ settings: { ...app.settings, swim: next } })
  toast(`Swim saved · next: rest ${next.rest_s} s, aim ${next.target_min} min`, () => {
    removeRow('logs', log.id)
    patchApp({ settings: prevSettings })
  })
}

// ---------- daily core & posture routine ----------

export function routineToday(): Log | undefined {
  const today = localDate()
  return get().logs.find((l) => l.type === 'stretch' && l.data.which === 'daily_routine' && l.local_date === today)
}

export function logRoutine() {
  const done = routineToday()
  if (done) { toast('Routine already done today', () => removeRow('logs', done.id)); return }
  addLog('stretch', { which: 'daily_routine' }, 'Core & posture routine ✓')
}

export function setStreakStart(date: string | null) {
  const app = get().appState
  if (!app) return
  const prev = app.settings
  patchApp({ settings: { ...app.settings, streak_start: date ?? undefined } })
  toast(date ? `Counting clean days from ${date}` : 'Start date cleared', () => patchApp({ settings: prev }))
}

// ---------- quran (by surah; every event is kept for history) ----------

export type QuranKind = QuranEvent['kind']
export const QURAN_KIND_LABEL: Record<QuranKind, string> = { learned: 'Learned', memorized: 'Memorized', revised: 'Revised' }

export function quranEvent(surah: number, kind: QuranKind, daysAgo = 0) {
  const at = agoIso(daysAgo)
  const ev: QuranEvent = { id: newId(), user_id: uid(), surah, kind, at, local_date: localDate(at), note: null }
  putRows('quran', [ev])
  toast(`${surahLatin(surah)} · ${QURAN_KIND_LABEL[kind].toLowerCase()}`, () => removeRow('quran', ev.id))
}

export function deleteQuranEvent(id: string) {
  const prev = get().quran.find((e) => e.id === id)
  removeRow('quran', id)
  toast('Removed', prev ? () => putRows('quran', [prev]) : undefined)
}

// ---------- french ----------

export function logFrench(activity: string, minutes: number) {
  const unit = get().appState?.french_unit ?? 1
  const name = activity[0].toUpperCase() + activity.slice(1)
  addLog('french', { activity, minutes, unit }, `French · ${name} · ${minutes} min`)
}

export function setFrenchUnit(n: number) {
  patchApp({ french_unit: Math.max(1, n) })
}

export function finishFrenchUnit() {
  const unit = get().appState?.french_unit ?? 1
  const log: Log = { id: newId(), user_id: uid(), logged_at: nowIso(), local_date: localDate(), type: 'french', data: { activity: 'finished_unit', minutes: 0, unit } }
  putRows('logs', [log])
  patchApp({ french_unit: unit + 1 })
  toast(`Unit ${unit} finished`, () => { removeRow('logs', log.id); patchApp({ french_unit: unit }) })
}

// ---------- focus (one kind: real, deep focus) ----------

const MIN_FOCUS_MIN = 1
const MAX_BREAK_MIN = 180

function closeBlock(reason: FocusBlock['end_reason'], endAt = nowIso()): FocusBlock | null {
  const f = get().appState?.focus
  if (!f) return null
  const mins = minutesBetween(f.started_at, endAt)
  if (f.mode === 'focus' && mins < MIN_FOCUS_MIN) return null
  if (f.mode === 'break' && mins > MAX_BREAK_MIN) return null
  const b: FocusBlock = {
    id: newId(), user_id: uid(), local_date: localDate(f.started_at), block_type: f.mode, kind: 'work',
    started_at: f.started_at, ended_at: endAt, end_reason: reason,
  }
  putRows('focus', [b])
  return b
}

function undoFocus(prevFocus: any, block: FocusBlock | null) {
  return () => {
    if (block) removeRow('focus', block.id)
    patchApp({ focus: prevFocus })
  }
}

export function startFocus() {
  const prev = get().appState?.focus ?? null
  const block = prev ? closeBlock(prev.mode === 'focus' ? 'stop' : 'resume') : null
  patchApp({ focus: { mode: 'focus', kind: 'work', started_at: nowIso() } })
  toast('Focus started', undoFocus(prev, block))
}

export function focusBreak(reason: 'break' | 'lost_focus') {
  const prev = get().appState?.focus
  if (!prev || prev.mode !== 'focus') return
  const block = closeBlock(reason)
  patchApp({ focus: { mode: 'break', kind: 'work', started_at: nowIso() } })
  toast(reason === 'break' ? 'Break' : 'Lost focus · resting', undoFocus(prev, block))
}

export function focusResume() {
  const prev = get().appState?.focus
  if (!prev || prev.mode !== 'break') return
  const block = closeBlock('resume')
  patchApp({ focus: { mode: 'focus', kind: 'work', started_at: nowIso() } })
  toast('Back to it', undoFocus(prev, block))
}

/** Stop now, or (if you forgot to tap Stop) save only the first `afterMin` minutes. */
export function focusStop(afterMin?: number) {
  const prev = get().appState?.focus
  if (!prev) return
  const endAt = afterMin != null ? new Date(new Date(prev.started_at).getTime() + afterMin * 60000).toISOString() : nowIso()
  const block = closeBlock('stop', endAt)
  patchApp({ focus: null })
  const mins = block && block.block_type === 'focus' ? minutesBetween(block.started_at, block.ended_at) : 0
  toast(mins ? `Saved · ${fmtDur(mins)} focus` : 'Stopped', undoFocus(prev, block))
}

// ---------- streak ----------

export function saveHabit(date: string, count: number, reason: string | null, porn = false) {
  const prev = get().habits.find((h) => h.entry_date === date)
  const now = nowIso()
  const row: HabitEntry = {
    id: prev?.id ?? newId(), user_id: uid(), entry_date: date, count: Math.max(0, count), porn: count > 0 && porn,
    reason: reason?.trim() ? reason.trim() : null, created_at: prev?.created_at ?? now, updated_at: now,
  }
  putRows('habits', [row], 'user_id,entry_date')
  toast(prev ? 'Entry updated' : 'Entry saved', () => (prev ? putRows('habits', [prev], 'user_id,entry_date') : removeRow('habits', row.id)))
}

export function deleteHabit(id: string) {
  const prev = get().habits.find((h) => h.id === id)
  removeRow('habits', id)
  toast('Entry deleted', prev ? () => putRows('habits', [prev], 'user_id,entry_date') : undefined)
}

// ---------- targets ----------

export function adjustTarget(key: string, dw: number, dr: number) {
  const t = get().targets[key]
  if (!t) return
  const next: Target = {
    ...t,
    weight_lb: t.weight_lb == null ? null : Math.max(0, Math.round((t.weight_lb + dw) * 100) / 100),
    reps: Math.max(1, t.reps + dr),
  }
  putTarget(next)
}

// ---------- workout session ----------

/** Start a day's session. `skip` leaves out steps (e.g. leg machines after a big hike), `note` says why. */
export function startSession(day: DayCode, skip: string[] = [], note?: string) {
  const app = get().appState
  if (!app) return
  if (app.active_session) return
  unlockAudio()
  const steps: StepState[] = DAYS[day].keys.filter((k) => !skip.includes(k)).map((key) => {
    const t = get().targets[key]
    const e = EX[key]
    return { key, weight: e.kind === 'weighted' ? t?.weight_lb ?? e.start : null, reps: t?.reps ?? e.lo, setsDone: 0 }
  })
  const now = nowIso()
  patchApp({ active_session: { day, started_at: now, step: 0, step_started_at: now, steps, rest_until: null, note } })
}

/** One set finished: start the rest countdown before the next set. */
export function setDone(i: number) {
  const s = get().appState?.active_session
  if (!s) return
  unlockAudio()
  const prev = s
  const st = s.steps[i]
  const e = EX[st.key]
  const n = (st.setsDone ?? 0) + 1
  const steps = s.steps.map((x, j) => (j === i ? { ...x, setsDone: n } : x))
  const now = Date.now()
  if (n < e.sets) {
    const r = restAfterSet(e, get().targets[st.key]?.last_feel ?? null, minutesBetween(s.started_at, now))
    patchApp({ active_session: { ...s, steps, rest_until: new Date(now + r * 1000).toISOString(), rest_total: r, rest_label: `Rest · then set ${n + 1} of ${e.sets}` } })
  } else {
    patchApp({ active_session: { ...s, steps, rest_until: null } })
  }
  toast(`Set ${n} of ${e.sets} done`, () => patchApp({ active_session: prev }))
}

export function skipRest() {
  const s = get().appState?.active_session
  if (s) patchApp({ active_session: { ...s, rest_until: null } })
}

export function addRest(sec: number) {
  const s = get().appState?.active_session
  if (!s?.rest_until) return
  patchApp({ active_session: { ...s, rest_until: new Date(new Date(s.rest_until).getTime() + sec * 1000).toISOString(), rest_total: (s.rest_total ?? 0) + sec } })
}

export function updateStep(i: number, p: Partial<StepState>) {
  const s = get().appState?.active_session
  if (!s) return
  const steps = s.steps.map((x, j) => (j === i ? { ...x, ...p } : x))
  patchApp({ active_session: { ...s, steps } })
}

/** Mark step i complete (done/feel/skip) and move on; returns to the previous state on Undo. */
export function completeStep(i: number, p: Partial<StepState>) {
  const s = get().appState?.active_session
  if (!s) return
  const prev = s
  const now = nowIso()
  const steps = s.steps.map((x, j) => (j === i ? { ...x, ...p, setsDone: p.done ? EX[x.key].sets : x.setsDone } : x))
  const nextIdx = steps.findIndex((x, j) => j > i && !x.done && !x.skipped)
  const allDone = nextIdx === -1
  // Rest before the next exercise (none after a warm-up or a skip).
  const r = !allDone && p.done ? restBetween(EX[steps[i].key], p.feel) : 0
  const rest = r > 0
    ? { rest_until: new Date(Date.now() + r * 1000).toISOString(), rest_total: r, rest_label: `Rest · next: ${EX[steps[nextIdx].key].short}` }
    : { rest_until: null }
  patchApp({ active_session: { ...s, steps, step: allDone ? steps.length : nextIdx, step_started_at: now, finished: allDone, ...rest } })
  const name = EX[steps[i].key].short
  toast(p.skipped ? `${name} skipped` : p.feel ? `${name} · ${p.feel.toUpperCase()}` : `${name} done`, () => patchApp({ active_session: prev }))
}

export function goToStep(i: number) {
  const s = get().appState?.active_session
  if (!s) return
  patchApp({ active_session: { ...s, step: i, step_started_at: nowIso(), finished: false } })
}

export interface FinishSummary {
  minutes: number
  rows: { name: string; feel: Feel | null; skipped: boolean; from: string; to: string; up: number }[]
}

function fmtTarget(key: string, w: number | null, r: number) {
  const e = EX[key]
  const unit = isSecs(e) ? ' s' : ''
  return w != null ? `${w} lb × ${r}` : `${r}${unit}`
}

/** Save workouts + workout_sets rows, update targets, advance the rotation. */
export function finishSession(early = false, endAt?: string): FinishSummary | null {
  const app = get().appState
  const s = app?.active_session
  if (!app || !s) return null
  const anyDone = s.steps.some((x) => x.done && EX[x.key].kind !== 'prep')
  if (!anyDone) {
    patchApp({ active_session: null })
    toast('Session discarded')
    return null
  }
  const now = endAt ?? nowIso()
  const workout: Workout = {
    id: newId(), user_id: app.user_id, local_date: localDate(s.started_at), day_code: s.day,
    started_at: s.started_at, ended_at: now, skill_key: null, skill_done: false, skill_minutes: null, ended_early: early,
  }
  const sets: WorkoutSet[] = []
  const summary: FinishSummary = { minutes: Math.round(minutesBetween(s.started_at, now)), rows: [] }
  const stretchLogs: Log[] = []

  s.steps.forEach((st, position) => {
    const e = EX[st.key]
    if (e.kind === 'skill') {
      workout.skill_key = e.skill!
      workout.skill_done = !!st.done
      workout.skill_minutes = st.minutes ?? null
      summary.rows.push({ name: e.short, feel: null, skipped: !st.done, from: st.done ? `${st.minutes ?? 0} min` : '—', to: '', up: 0 })
      return
    }
    if (!st.done && !st.skipped) return // not reached (ended early)
    const t = get().targets[st.key]
    let nextW: number | null = null
    let nextR: number | null = null
    if (st.done && e.kind !== 'stretch' && e.kind !== 'prep' && st.feel) {
      const res = progress(e, { weight: st.weight ?? null, reps: st.reps ?? e.lo, targetReps: t?.reps ?? e.lo, feel: st.feel, prevFeel: t?.last_feel ?? null })
      nextW = res.weight
      nextR = res.reps
      const up = (nextW ?? 0) - (st.weight ?? 0) || nextR - (st.reps ?? 0)
      summary.rows.push({ name: e.short, feel: res.feel, skipped: false, from: fmtTarget(st.key, st.weight ?? null, st.reps ?? e.lo), to: fmtTarget(st.key, nextW, nextR), up: Math.sign(up) })
      putTarget({
        ...(t ?? { user_id: app.user_id, exercise_key: st.key, times_done: 0, calibrated: false, last_feel: null, weight_lb: null, reps: e.lo }),
        weight_lb: nextW, reps: nextR, last_feel: res.feel, times_done: (t?.times_done ?? 0) + 1, calibrated: true,
      })
      st = { ...st, feel: res.feel }
    } else {
      summary.rows.push({ name: e.short, feel: null, skipped: !!st.skipped, from: st.skipped ? 'skipped' : 'done', to: '', up: 0 })
    }
    if (st.done && e.stretchWhich) {
      stretchLogs.push({ id: newId(), user_id: app.user_id, logged_at: now, local_date: localDate(now), type: 'stretch', data: { which: e.stretchWhich, in_session: true } })
    }
    sets.push({
      id: newId(), workout_id: workout.id, user_id: app.user_id, position, exercise_key: st.key,
      name_used: st.swapped && e.swap ? e.swap : e.name,
      sets: e.kind === 'prep' ? null : (st.setsDone || e.sets || null), reps: e.kind === 'prep' ? null : e.kind === 'stretch' ? e.lo : st.reps ?? null,
      weight_lb: e.kind === 'prep' ? null : st.weight ?? null,
      feel: st.feel ?? null, skipped: !!st.skipped, next_weight_lb: nextW, next_reps: nextR,
    })
  })

  putRows('workouts', [workout])
  putRows('sets', sets)
  if (stretchLogs.length) putRows('logs', stretchLogs)
  patchApp({ active_session: null, rotation_next: nextDay(s.day) })
  return summary
}

/**
 * A workout left open for hours (app closed mid-session) is saved as it was at the last tap,
 * so it can't turn into a 17-hour session.
 */
export function autoCloseStaleSession(maxIdleMin = 180) {
  const s = get().appState?.active_session
  if (!s) return
  if (minutesBetween(s.step_started_at, Date.now()) < maxIdleMin) return
  const res = finishSession(true, s.step_started_at)
  toast(res ? `Saved your unfinished Day ${s.day} from earlier` : 'Closed an empty workout from earlier')
}

/** Fix a past set (e.g. the weight you actually used). Updates the current target if it's your latest. */
export function editSet(set: WorkoutSet, patch: Partial<Pick<WorkoutSet, 'weight_lb' | 'reps'>>) {
  const next = { ...set, ...patch }
  putRows('sets', [next])
  const started = (id: string) => get().workouts.find((w) => w.id === id)?.started_at ?? ''
  const latest = get().sets.filter((x) => x.exercise_key === set.exercise_key && !x.skipped)
    .sort((a, b) => started(a.workout_id).localeCompare(started(b.workout_id))).at(-1)
  const t = get().targets[set.exercise_key]
  const prevT = t
  if (t && latest?.id === set.id && patch.weight_lb !== undefined) putTarget({ ...t, weight_lb: patch.weight_lb })
  toast('Workout updated', () => { putRows('sets', [set]); if (prevT) putTarget(prevT) })
}

export function discardSession() {
  const prev = get().appState?.active_session
  patchApp({ active_session: null })
  toast('Session discarded', prev ? () => patchApp({ active_session: prev }) : undefined)
}

export function setRotation(d: DayCode) {
  patchApp({ rotation_next: d })
}

// ---------- settings ----------

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`ahmed-os:${uid()}:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function setPin(pin: string | null) {
  patchApp({ streak_pin_hash: pin ? await hashPin(pin) : null })
  set({ streakUnlocked: true })
  toast(pin ? 'Streak PIN set' : 'Streak PIN off')
}

export function patchSettings(p: Record<string, any>) {
  const app = get().appState
  if (!app) return
  patchApp({ settings: { ...app.settings, ...p } })
}

export type { ActiveSession }

// ---------- weekly plan ----------

export function saveWeekPlan(plan: WeekPlan) {
  const app = get().appState
  if (!app) return
  const all = { ...(app.settings.week_plans ?? {}), [plan.week_start]: plan }
  // keep the last 12 weeks
  const keep = Object.keys(all).sort().slice(-12)
  patchApp({ settings: { ...app.settings, week_plans: Object.fromEntries(keep.map((k) => [k, all[k]])) } })
}

export function setPlanSlot(ws: string, idx: number, slot: PlanSlot) {
  const app = get().appState
  const plan = app?.settings.week_plans?.[ws]
  if (!app || !plan) return
  const prevSettings = app.settings
  const days = plan.days.map((s, i) => (i === idx ? slot : s))
  saveWeekPlan({ ...plan, days })
  toast('Plan updated', () => patchApp({ settings: prevSettings }))
}

// ---------- tasks ----------

const tasksNow = () => get().appState?.settings.tasks ?? []

function saveTasks(tasks: Task[]) {
  const app = get().appState
  if (!app) return
  // finished tasks are kept 90 days for the stats, then dropped
  const cutoff = addDays(localDate(), -90)
  patchApp({ settings: { ...app.settings, tasks: tasks.filter((t) => !t.done_at || localDate(t.done_at) >= cutoff) } })
}

export function addTask(title: string, due: string | null) {
  const t = title.trim()
  if (!t) return
  saveTasks([...tasksNow(), { id: newId(), title: t, due, created_at: nowIso() }])
}

export function updateTask(id: string, patch: Partial<Task>) {
  saveTasks(tasksNow().map((t) => (t.id === id ? { ...t, ...patch } : t)))
}

export function toggleTask(id: string) {
  const t = tasksNow().find((x) => x.id === id)
  if (t) updateTask(id, { done_at: t.done_at ? null : nowIso() })
}

export function deleteTask(id: string) {
  const prev = tasksNow()
  saveTasks(prev.filter((t) => t.id !== id))
  toast('Task deleted', () => saveTasks(prev))
}

/** Not needed today: hide it until tomorrow (and push a deadline that's already here). */
export function moveTaskToTomorrow(id: string) {
  const prev = tasksNow()
  const t = prev.find((x) => x.id === id)
  if (!t) return
  const tomorrow = addDays(localDate(), 1)
  updateTask(id, { plan_on: tomorrow, due: t.due && t.due < tomorrow ? tomorrow : t.due })
  toast('Moved to tomorrow', () => saveTasks(prev))
}

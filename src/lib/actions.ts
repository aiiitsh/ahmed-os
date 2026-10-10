// Every user action. Each one updates local state, writes, and (where it makes sense) offers Undo.
import { get, newId, patchApp, putJuz, putRows, putTarget, removeRow, set, uid } from './store'
import { toast } from './toast'
import { hhmm, localDate, minutesBetween, nowIso, fmtDur } from './time'
import { CARDIO, DAYS, EX, STRETCH_LABEL, nextDay, type Sport } from '../data/program'
import { progress } from './progression'
import type { ActiveSession, DayCode, Feel, FocusBlock, HabitEntry, Juz, Log, LogType, SleepRow, StepState, Target, Workout, WorkoutSet } from './types'

// ---------- generic logs ----------

export function addLog(type: LogType, data: Record<string, any>, label: string, at = nowIso()): Log {
  const log: Log = { id: newId(), user_id: uid(), logged_at: at, local_date: localDate(at), type, data }
  putRows('logs', [log])
  toast(label, () => removeRow('logs', log.id))
  return log
}

export const logCardio = (sport: Sport, variant: string, minutes: number) => {
  const v = CARDIO[sport].variants.find((x) => x[0] === variant)?.[1] ?? variant
  addLog('cardio', { sport, variant, minutes }, `${CARDIO[sport].label} · ${v} · ${minutes} min`)
}

export const logStretch = (which: string) => addLog('stretch', { which }, `Stretch · ${STRETCH_LABEL[which] ?? which}`)

export const flagBack = () => addLog('flag', { which: 'lower_back_tight' }, 'Lower back tight · noted')

export function proteinToday(): Log | undefined {
  const today = localDate()
  return get().logs.find((l) => l.type === 'protein' && l.local_date === today)
}

export function logProtein() {
  const existing = proteinToday()
  if (existing) {
    toast('Protein already logged today', () => removeRow('logs', existing.id))
    return
  }
  addLog('protein', { hit: true }, 'Protein hit ✓')
}

export const logBodyweight = (kg: number) => addLog('bodyweight', { kg: Math.round(kg * 10) / 10 }, `Bodyweight · ${kg.toFixed(1)} kg`)

export function deleteEntry(kind: 'logs' | 'sleep' | 'workouts' | 'focus', id: string) {
  removeRow(kind, id)
  toast('Deleted')
}

// ---------- sleep ----------

export function goingToBed() {
  const prev = get().appState?.pending_bed_at ?? null
  const at = nowIso()
  patchApp({ pending_bed_at: at })
  toast(`Going to bed · ${hhmm(at)}`, () => patchApp({ pending_bed_at: prev }))
}

export function wokeUp() {
  const app = get().appState
  if (!app) return
  const now = nowIso()
  const today = localDate(now)
  const prevRow = get().sleep.find((s) => s.wake_date === today)
  const bed = app.pending_bed_at
  const valid = bed && minutesBetween(bed, now) > 0 && minutesBetween(bed, now) <= 16 * 60
  const row: SleepRow = {
    id: prevRow?.id ?? newId(), user_id: app.user_id, wake_date: today,
    bed_at: valid ? bed : prevRow?.bed_at ?? null,
    wake_at: now,
    minutes: valid ? Math.round(minutesBetween(bed!, now)) : prevRow?.minutes ?? null,
  }
  putRows('sleep', [row], 'user_id,wake_date')
  if (valid) patchApp({ pending_bed_at: null })
  toast(valid ? `Woke up · slept ${fmtDur(row.minutes!)}` : `Woke up · ${hhmm(now)}`, () => {
    if (prevRow) putRows('sleep', [prevRow], 'user_id,wake_date')
    else removeRow('sleep', row.id)
    if (valid) patchApp({ pending_bed_at: bed })
  })
}

/** ±15 min fixes from Review. */
export function shiftSleep(row: SleepRow, field: 'bed_at' | 'wake_at', deltaMin: number) {
  const base = row[field] ?? (field === 'bed_at' && row.wake_at ? new Date(new Date(row.wake_at).getTime() - 8 * 3600000).toISOString() : null)
  if (!base) return
  const next = { ...row, [field]: new Date(new Date(base).getTime() + deltaMin * 60000).toISOString() }
  next.minutes = next.bed_at && next.wake_at ? Math.round(minutesBetween(next.bed_at, next.wake_at)) : null
  putRows('sleep', [next], 'user_id,wake_date')
}

// ---------- quran ----------

export type QuranMode = 'revise' | 'memorize' | 'clear'

export function quranTap(n: number, mode: QuranMode) {
  const prev = get().juz[n] ?? { user_id: uid(), juz: n, memorized: false, last_revised: null, last_memorized: null }
  const today = localDate()
  let next: Juz
  let log: Log | null = null
  if (mode === 'clear') next = { ...prev, memorized: false }
  else {
    next = mode === 'memorize'
      ? { ...prev, memorized: true, last_memorized: today, last_revised: today }
      : { ...prev, memorized: true, last_revised: today }
    log = { id: newId(), user_id: uid(), logged_at: nowIso(), local_date: today, type: 'quran', data: { juz: n, mode } }
    putRows('logs', [log])
  }
  putJuz(next)
  const label = mode === 'clear' ? `Juz ${n} cleared` : mode === 'memorize' ? `Juz ${n} memorized` : `Juz ${n} revised`
  toast(label, () => {
    putJuz(prev)
    if (log) removeRow('logs', log.id)
  })
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

// ---------- focus ----------

const MIN_FOCUS_MIN = 1
const MAX_BREAK_MIN = 180

function closeBlock(reason: FocusBlock['end_reason']): FocusBlock | null {
  const f = get().appState?.focus
  if (!f) return null
  const end = nowIso()
  const mins = minutesBetween(f.started_at, end)
  if (f.mode === 'focus' && mins < MIN_FOCUS_MIN) return null
  if (f.mode === 'break' && mins > MAX_BREAK_MIN) return null
  const b: FocusBlock = {
    id: newId(), user_id: uid(), local_date: localDate(f.started_at), block_type: f.mode, kind: f.kind,
    started_at: f.started_at, ended_at: end, end_reason: reason,
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

export function startFocus(kind: 'work' | 'study') {
  const prev = get().appState?.focus ?? null
  const block = prev ? closeBlock(prev.mode === 'focus' ? 'stop' : 'resume') : null
  patchApp({ focus: { mode: 'focus', kind, started_at: nowIso() } })
  toast(`${kind === 'work' ? 'Work' : 'Study'} focus started`, undoFocus(prev, block))
}

export function focusBreak(reason: 'break' | 'lost_focus') {
  const prev = get().appState?.focus
  if (!prev || prev.mode !== 'focus') return
  const block = closeBlock(reason)
  patchApp({ focus: { mode: 'break', kind: prev.kind, started_at: nowIso() } })
  toast(reason === 'break' ? 'Break' : 'Lost focus · resting', undoFocus(prev, block))
}

export function focusResume() {
  const prev = get().appState?.focus
  if (!prev || prev.mode !== 'break') return
  const block = closeBlock('resume')
  patchApp({ focus: { mode: 'focus', kind: prev.kind, started_at: nowIso() } })
  toast('Back to it', undoFocus(prev, block))
}

export function focusStop() {
  const prev = get().appState?.focus
  if (!prev) return
  const block = closeBlock('stop')
  patchApp({ focus: null })
  const mins = block && block.block_type === 'focus' ? minutesBetween(block.started_at, block.ended_at) : 0
  toast(mins ? `Stopped · ${fmtDur(mins)} focus` : 'Stopped', undoFocus(prev, block))
}

// ---------- streak ----------

export function saveHabit(date: string, count: number, reason: string | null) {
  const prev = get().habits.find((h) => h.entry_date === date)
  const now = nowIso()
  const row: HabitEntry = {
    id: prev?.id ?? newId(), user_id: uid(), entry_date: date, count: Math.max(0, count),
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

// ---------- skills & targets ----------

export function patchSkill(key: string, p: Partial<{ level: number; level_name: string; pct: number; active: boolean }>) {
  const app = get().appState
  if (!app) return
  const prev = app.skills
  const cur = prev[key]
  if (!cur) return
  patchApp({ skills: { ...prev, [key]: { ...cur, ...p } } })
  return () => patchApp({ skills: prev })
}

export function levelUp(key: string) {
  const s = get().appState?.skills[key]
  if (!s) return
  const undo = patchSkill(key, { level: s.level + 1, level_name: `Lvl ${s.level + 1}`, pct: 0 })
  toast(`${s.name} → Lvl ${s.level + 1}`, undo)
}

export function bumpSkillPct(key: string, d: number) {
  const s = get().appState?.skills[key]
  if (!s) return
  const undo = patchSkill(key, { pct: Math.max(0, Math.min(100, s.pct + d)) })
  toast(`${s.name} ${Math.max(0, Math.min(100, s.pct + d))}%`, undo)
}

export function adjustTarget(key: string, dw: number, dr: number) {
  const t = get().targets[key]
  if (!t) return
  const next: Target = {
    ...t,
    weight_kg: t.weight_kg == null ? null : Math.max(0, Math.round((t.weight_kg + dw) * 100) / 100),
    reps: Math.max(1, t.reps + dr),
  }
  putTarget(next)
}

// ---------- workout session ----------

export function startSession(day: DayCode) {
  const app = get().appState
  if (!app) return
  if (app.active_session) return
  const steps: StepState[] = DAYS[day].keys.map((key) => {
    const t = get().targets[key]
    const e = EX[key]
    return { key, weight: t?.weight_kg ?? e.start, reps: t?.reps ?? e.lo }
  })
  const now = nowIso()
  patchApp({ active_session: { day, started_at: now, step: 0, step_started_at: now, steps } })
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
  const steps = s.steps.map((x, j) => (j === i ? { ...x, ...p } : x))
  const nextIdx = steps.findIndex((x, j) => j > i && !x.done && !x.skipped)
  const allDone = nextIdx === -1
  patchApp({ active_session: { ...s, steps, step: allDone ? steps.length : nextIdx, step_started_at: now, finished: allDone } })
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
  const unit = e.kind === 'timed' ? ' s' : ''
  return w != null ? `${w} kg × ${r}` : `${r}${unit}`
}

/** Save workouts + workout_sets rows, update targets, advance the rotation. */
export function finishSession(early = false): FinishSummary | null {
  const app = get().appState
  const s = app?.active_session
  if (!app || !s) return null
  const anyDone = s.steps.some((x) => x.done)
  if (!anyDone) {
    patchApp({ active_session: null })
    toast('Session discarded')
    return null
  }
  const now = nowIso()
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
    if (st.done && e.kind !== 'stretch' && st.feel) {
      const res = progress(e, { weight: st.weight ?? null, reps: st.reps ?? e.lo, targetReps: t?.reps ?? e.lo, feel: st.feel, prevFeel: t?.last_feel ?? null })
      nextW = res.weight
      nextR = res.reps
      const up = (nextW ?? 0) - (st.weight ?? 0) || nextR - (st.reps ?? 0)
      summary.rows.push({ name: e.short, feel: res.feel, skipped: false, from: fmtTarget(st.key, st.weight ?? null, st.reps ?? e.lo), to: fmtTarget(st.key, nextW, nextR), up: Math.sign(up) })
      putTarget({
        ...(t ?? { user_id: app.user_id, exercise_key: st.key, times_done: 0, calibrated: false, last_feel: null, weight_kg: null, reps: e.lo }),
        weight_kg: nextW, reps: nextR, last_feel: res.feel, times_done: (t?.times_done ?? 0) + 1, calibrated: true,
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
      sets: e.sets || null, reps: e.kind === 'stretch' ? e.lo : st.reps ?? null, weight_kg: st.weight ?? null,
      feel: st.feel ?? null, skipped: !!st.skipped, next_weight_kg: nextW, next_reps: nextR,
    })
  })

  putRows('workouts', [workout])
  putRows('sets', sets)
  if (stretchLogs.length) putRows('logs', stretchLogs)
  patchApp({ active_session: null, rotation_next: nextDay(s.day) })
  return summary
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

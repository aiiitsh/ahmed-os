// Dev-only preview: `npm run dev` then open /ahmed-os/?demo. Local sample data, no Supabase.
import { EXERCISES, seedTarget } from '../data/program'
import type { Data } from './store'
import { addDays, localDate } from './time'
import type { Log, QuranEvent } from './types'

export const demoMode = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')

export function demoData(uid: string): Data {
  const today = localDate()
  const iso = (d: string, hh: number, mm = 0) => new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-04:00`).toISOString()
  let n = 0
  const id = () => `demo-${++n}`
  const log = (d: string, hh: number, type: Log['type'], data: Record<string, any>): Log => ({ id: id(), user_id: uid, logged_at: iso(d, hh), local_date: d, type, data })

  const logs: Log[] = []
  for (let i = 1; i < 6; i++) if (i % 2) logs.push(log(addDays(today, -i), 20, 'french', { activity: 'book', minutes: 30, unit: 3 }))
  logs.push(log(addDays(today, -9), 18, 'cardio', { sport: 'swim', variant: 'sprints', minutes: 16, intensity: 'intense', rest_s: 120, target_min: 20 }))
  logs.push(log(addDays(today, -5), 18, 'cardio', { sport: 'swim', variant: 'sprints', minutes: 25, intensity: 'intense', rest_s: 120, target_min: 20 }))
  logs.push(log(addDays(today, -1), 10, 'cardio', { sport: 'hike', variant: 'hike', km: 21, minutes: 330 }))
  logs.push(log(addDays(today, -3), 8, 'stretch', { which: 'daily_routine' }))

  // Workouts: A and B done, C never (so the planner should pick C, but not after yesterday's hike).
  const wA = { id: id(), user_id: uid, local_date: addDays(today, -3), day_code: 'A' as const, started_at: iso(addDays(today, -3), 17), ended_at: iso(addDays(today, -3), 18), skill_key: 'muscleup', skill_done: true, skill_minutes: 25, ended_early: false }
  const wB = { id: id(), user_id: uid, local_date: addDays(today, -4), day_code: 'B' as const, started_at: iso(addDays(today, -4), 17), ended_at: iso(addDays(today, -4), 18, 20), skill_key: 'planche', skill_done: true, skill_minutes: 20, ended_early: false }
  const sets = ['db_curl', 'db_oh_triceps', 'db_lateral'].map((k, i) => ({
    id: id(), workout_id: wA.id, user_id: uid, position: i + 1, exercise_key: k, name_used: k, sets: 3, reps: 10, weight_lb: [20, 25, 12.5][i],
    feel: (['good', 'hard', 'easy'] as const)[i], skipped: false, next_weight_lb: [20, 25, 12.5][i], next_reps: [11, 10, 12][i],
  }))

  const focus = [0, 1, 2, 3].flatMap((i) => {
    const d = addDays(today, -i)
    return [
      { id: id(), user_id: uid, local_date: d, block_type: 'focus' as const, kind: 'work' as const, started_at: iso(d, 9), ended_at: iso(d, 10, 20 + i * 5), end_reason: 'break' as const },
      { id: id(), user_id: uid, local_date: d, block_type: 'break' as const, kind: 'work' as const, started_at: iso(d, 10, 20 + i * 5), ended_at: iso(d, 10, 35 + i * 5), end_reason: 'resume' as const },
      { id: id(), user_id: uid, local_date: d, block_type: 'focus' as const, kind: 'work' as const, started_at: iso(d, 10, 35 + i * 5), ended_at: iso(d, 11, 30), end_reason: 'lost_focus' as const },
    ]
  })

  const q = (surah: number, kind: QuranEvent['kind'], daysAgo: number): QuranEvent =>
    ({ id: id(), user_id: uid, surah, kind, at: iso(addDays(today, -daysAgo), 6), local_date: addDays(today, -daysAgo), note: null })
  const quran = [q(112, 'learned', 20), q(112, 'memorized', 18), q(112, 'revised', 5), q(113, 'learned', 12), q(113, 'memorized', 9),
    q(114, 'learned', 10), q(67, 'learned', 3), q(1, 'revised', 1), q(112, 'revised', 0)]

  const habits = [3, 9, 10, 24, 40, 41, 60, 90].map((k, i) => ({ id: id(), user_id: uid, entry_date: addDays(today, -k), count: (i % 4) + 1, porn: i % 3 === 0, reason: i % 2 ? 'Late night, phone in bed.' : null }))

  return {
    appState: {
      user_id: uid, rotation_next: 'C', skills: {}, french_unit: 3, pending_bed_at: null, focus: null,
      active_session: null, streak_pin_hash: null, settings: { french_level: 'A1', streak_start: addDays(today, -95) },
    },
    targets: Object.fromEntries(EXERCISES.map((e) => [e.key, { user_id: uid, exercise_key: e.key, ...seedTarget(e), last_feel: null, times_done: 0, calibrated: e.key.startsWith('db_') && e.days.includes('A') }])),
    quran, logs, focus, workouts: [wA, wB], sets, habits, reviews: [],
  }
}

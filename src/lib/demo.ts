// Dev-only preview: `npm run dev` then open /ahmed-os/?demo. Local sample data, no Supabase.
import { EXERCISES, SKILLS_SEED, seedTarget } from '../data/program'
import type { Data } from './store'
import { addDays, localDate, weekStart } from './time'
import type { Log } from './types'

export const demoMode = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')

export function demoData(uid: string): Data {
  const today = localDate()
  const ws = weekStart(today)
  const iso = (d: string, hh: number, mm = 0) => new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-04:00`).toISOString()
  let n = 0
  const id = () => `demo-${++n}`
  const log = (d: string, hh: number, type: Log['type'], data: Record<string, any>): Log => ({ id: id(), user_id: uid, logged_at: iso(d, hh), local_date: d, type, data })

  const logs: Log[] = []
  for (let i = 0; i < 56; i += 7) logs.push(log(addDays(today, -i), 8, 'bodyweight', { kg: 72 + i * 0.03 }))
  for (let i = 1; i < 6; i++) {
    const d = addDays(today, -i)
    logs.push(log(d, 6, 'quran', { juz: (i % 5) + 1, mode: 'revise' }))
    if (i % 2) logs.push(log(d, 20, 'french', { activity: 'book', minutes: 30, unit: 3 }))
    if (i % 2 === 0) logs.push(log(d, 13, 'protein', { hit: true }))
  }
  logs.push(log(addDays(today, -2), 18, 'cardio', { sport: 'swim', variant: 'endurance', minutes: 45 }))
  logs.push(log(addDays(today, -5), 19, 'stretch', { which: 'hip_flexors' }))
  logs.push(log(today, 7, 'quran', { juz: 2, mode: 'revise' }))

  const sleep = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -i)
    const bedH = 23 + (i % 3) * 0.5
    const bed = new Date(new Date(iso(addDays(d, -1), 23)).getTime() + (bedH - 23) * 3600000).toISOString()
    const wake = iso(d, 7, 15)
    return { id: id(), user_id: uid, wake_date: d, bed_at: bed, wake_at: wake, minutes: Math.round((new Date(wake).getTime() - new Date(bed).getTime()) / 60000) }
  })

  const w1 = { id: id(), user_id: uid, local_date: ws, day_code: 'A' as const, started_at: iso(ws, 17), ended_at: iso(ws, 18), skill_key: 'muscleup', skill_done: true, skill_minutes: 22, ended_early: false }
  const sets = ['db_curl', 'db_oh_triceps', 'db_lateral'].map((k, i) => ({
    id: id(), workout_id: w1.id, user_id: uid, position: i + 1, exercise_key: k, name_used: k, sets: 3, reps: 10, weight_kg: [10, 12, 6][i],
    feel: (['good', 'hard', 'easy'] as const)[i], skipped: false, next_weight_kg: [10, 12, 6][i], next_reps: [11, 10, 12][i],
  }))

  const focus = [0, 1, 2].flatMap((i) => {
    const d = addDays(today, -i)
    return [
      { id: id(), user_id: uid, local_date: d, block_type: 'focus' as const, kind: 'work' as const, started_at: iso(d, 9), ended_at: iso(d, 10, 20 + i * 10), end_reason: 'break' as const },
      { id: id(), user_id: uid, local_date: d, block_type: 'break' as const, kind: 'work' as const, started_at: iso(d, 10, 20 + i * 10), ended_at: iso(d, 10, 35 + i * 10), end_reason: 'resume' as const },
      { id: id(), user_id: uid, local_date: d, block_type: 'focus' as const, kind: 'study' as const, started_at: iso(d, 10, 35 + i * 10), ended_at: iso(d, 11, 30), end_reason: 'lost_focus' as const },
    ]
  })

  const habits = [3, 9, 10, 24, 40, 41, 60, 90].map((k, i) => ({ id: id(), user_id: uid, entry_date: addDays(today, -k), count: (i % 4) + 1, reason: i % 2 ? 'Late night, phone in bed.' : null }))

  return {
    appState: {
      user_id: uid, rotation_next: 'B', skills: SKILLS_SEED, french_unit: 3, pending_bed_at: null, focus: null,
      active_session: null, streak_pin_hash: null, settings: { french_level: 'A1', units: 'kg' },
    },
    targets: Object.fromEntries(EXERCISES.map((e) => [e.key, { user_id: uid, exercise_key: e.key, ...seedTarget(e), last_feel: null, times_done: 0, calibrated: e.key.startsWith('db_') && e.days.includes('A') }])),
    juz: Object.fromEntries(Array.from({ length: 30 }, (_, i) => {
      const j = i + 1
      const memorized = j <= 12 || j === 30
      const last_revised = memorized ? addDays(today, -((j * 3) % 20)) : null
      return [j, { user_id: uid, juz: j, memorized, last_revised, last_memorized: null }]
    })),
    logs, sleep, focus, workouts: [w1], sets, habits, reviews: [],
  }
}

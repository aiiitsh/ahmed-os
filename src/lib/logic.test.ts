import { describe, expect, it } from 'vitest'
import { progress, nextSwim } from './progression'
import { addDays, localDate, weekStart, dow } from './time'
import { habitStats, groupSets } from './stats'
import { trainingPlan, swimPlanFrom, dayPlan, tomorrowPreview } from './plan'
import { cardioCredit } from './activity'
import { restAfterSet, restBetween } from './rest'
import { kgToLb } from './format'
import type { Data } from './store'
import { EX } from '../data/program'
import type { HabitEntry, Workout, WorkoutSet } from './types'

describe('progression (7.5)', () => {
  const curl = EX.db_curl // 10–12, step 5 lb
  const knee = EX.hanging_knee_raise // 8–15 bodyweight
  const plank = EX.side_plank // 30–60 s, +5
  const thrust = EX.hip_thrust_machine // maintain

  it('Easy adds 2 reps while in range', () => {
    expect(progress(curl, { weight: 20, reps: 10, targetReps: 10, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 20, reps: 12 })
  })
  it('Easy at the top bumps weight and resets reps', () => {
    expect(progress(curl, { weight: 20, reps: 12, targetReps: 12, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 25, reps: 10 })
  })
  it('Good adds 1 rep, then bumps weight at the top', () => {
    expect(progress(curl, { weight: 20, reps: 11, targetReps: 11, feel: 'good', prevFeel: null })).toMatchObject({ weight: 20, reps: 12 })
    expect(progress(curl, { weight: 20, reps: 12, targetReps: 12, feel: 'good', prevFeel: null })).toMatchObject({ weight: 25, reps: 10 })
  })
  it('Hard keeps, Hard twice drops weight', () => {
    expect(progress(curl, { weight: 25, reps: 10, targetReps: 10, feel: 'hard', prevFeel: 'good' })).toMatchObject({ weight: 25, reps: 10 })
    expect(progress(curl, { weight: 25, reps: 11, targetReps: 11, feel: 'hard', prevFeel: 'hard' })).toMatchObject({ weight: 20, reps: 10 })
  })
  it('missed target is treated as Hard and keeps the target', () => {
    const r = progress(curl, { weight: 25, reps: 9, targetReps: 11, feel: 'easy', prevFeel: null })
    expect(r).toMatchObject({ feel: 'hard', weight: 25, reps: 11 })
  })
  it('bodyweight Easy at the top shows the harder chip', () => {
    expect(progress(knee, { weight: null, reps: 14, targetReps: 14, feel: 'easy', prevFeel: null })).toMatchObject({ reps: 15, harder: true })
  })
  it('timed moves step by 5 s', () => {
    expect(progress(plank, { weight: null, reps: 30, targetReps: 30, feel: 'good', prevFeel: null })).toMatchObject({ reps: 35 })
    expect(progress(plank, { weight: null, reps: 30, targetReps: 30, feel: 'easy', prevFeel: null })).toMatchObject({ reps: 40 })
  })
  it('maintain: only Hard lowers the weight', () => {
    expect(progress(thrust, { weight: 90, reps: 10, targetReps: 10, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 90, reps: 10 })
    expect(progress(thrust, { weight: 90, reps: 10, targetReps: 10, feel: 'hard', prevFeel: null })).toMatchObject({ weight: 80, reps: 10 })
  })
})

describe('time', () => {
  it('weeks start on Saturday', () => {
    expect(weekStart('2026-10-10')).toBe('2026-10-10') // Sat
    expect(weekStart('2026-10-16')).toBe('2026-10-10') // Fri
    expect(weekStart('2026-10-17')).toBe('2026-10-17') // next Sat
    expect(dow(weekStart('2026-03-04'))).toBe(6)
  })
  it('local date is Toronto, not UTC', () => {
    // 2026-10-11 02:30 UTC = 2026-10-10 22:30 EDT
    expect(localDate('2026-10-11T02:30:00Z')).toBe('2026-10-10')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('habit streak (9.7)', () => {
  const e = (d: string, count: number): HabitEntry => ({ id: d, user_id: 'u', entry_date: d, count, reason: null })
  it('counts days since the last day with count > 0', () => {
    const s = habitStats([e('2026-10-01', 1), e('2026-10-05', 2)], '2026-10-10')
    expect(s.current).toBe(5)
    expect(s.best).toBe(5)
  })
  it('is 0 when today has a positive entry', () => {
    expect(habitStats([e('2026-10-10', 1)], '2026-10-10').current).toBe(0)
  })
  it('clean days on purpose count toward the streak', () => {
    expect(habitStats([e('2026-10-08', 0)], '2026-10-10').current).toBe(3)
  })
  it('counts from the chosen start date before any entries', () => {
    expect(habitStats([], '2026-10-11', '2026-10-10').current).toBe(2)
    const s = habitStats([e('2026-10-12', 1)], '2026-10-12', '2026-10-10')
    expect(s.current).toBe(0)
    expect(s.best).toBe(2)
  })
  it('best streak looks at gaps between positive days', () => {
    expect(habitStats([e('2026-09-01', 1), e('2026-09-20', 1), e('2026-10-08', 1)], '2026-10-10').best).toBe(18)
  })
})

describe('muscle credit (7.4)', () => {
  it('skill sessions and sets credit their groups', () => {
    const w: Workout = { id: 'w', user_id: 'u', local_date: '2026-10-10', day_code: 'A', started_at: '', ended_at: null, skill_key: 'muscleup', skill_done: true, skill_minutes: 20, ended_early: false }
    const s = (key: string, skipped = false): WorkoutSet => ({ id: key, workout_id: 'w', user_id: 'u', position: 0, exercise_key: key, name_used: key, sets: EX[key].sets, reps: 10, weight_lb: 10, feel: 'good', skipped, next_weight_lb: null, next_reps: null })
    const g = groupSets([w], [s('db_curl'), s('db_oh_triceps'), s('db_lateral', true)])
    expect(g.arms).toBe(2 + 3 + 3)
    expect(g.pull).toBe(4)
    expect(g.shoulders).toBe(0)
  })
})

describe('swim intervals', () => {
  const cur = { rest_s: 45, target_min: 20 }
  it('hitting the target on moderate cuts rest and raises the target', () => {
    expect(nextSwim(cur, { minutes: 22, rest_s: 45, intensity: 'moderate' })).toEqual({ rest_s: 40, target_min: 24 })
  })
  it('easy always cuts rest by 10 s', () => {
    expect(nextSwim(cur, { minutes: 15, rest_s: 45, intensity: 'easy' })).toEqual({ rest_s: 35, target_min: 20 })
  })
  it('intense and short of target adds rest, keeps target', () => {
    expect(nextSwim(cur, { minutes: 12, rest_s: 45, intensity: 'intense' })).toEqual({ rest_s: 50, target_min: 20 })
  })
  it('rest stays within 15–90 s', () => {
    expect(nextSwim({ rest_s: 15, target_min: 10 }, { minutes: 30, rest_s: 15, intensity: 'easy' }).rest_s).toBe(15)
  })
})

describe('dynamic plan', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const log = (d: string, data: any) => ({ id: d + data.sport, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data })

  it('picks the day never done (C)', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')] }
    expect(trainingPlan(data, '2026-10-19')).toMatchObject({ state: 'go', day: 'C' })
  })
  it('skips Day C the day after a long hike', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-18', { sport: 'hike', km: 21, minutes: 330 })] }
    const p = trainingPlan(data, '2026-10-19')
    expect(p.day).toBe('B')
    expect(p.state).toBe('rest') // a 21 km hike yesterday means rest
    expect(p.why).toMatch(/rest today/)
  })
  it('suggests recovery after two training days in a row', () => {
    const data = { ...base(), workouts: [wo('2026-10-17', 'A'), wo('2026-10-18', 'B')] }
    expect(trainingPlan(data, '2026-10-19').state).toBe('rest')
  })
  it('is done once trained today', () => {
    const data = { ...base(), workouts: [wo('2026-10-19', 'C')] }
    expect(trainingPlan(data, '2026-10-19')).toMatchObject({ state: 'done', doneDay: 'C' })
  })
  it('next swim comes from the last swim actually logged (120 s intense on target → stays 120 s)', () => {
    const data = { ...base(), logs: [log('2026-10-14', { sport: 'swim', minutes: 25, intensity: 'intense', rest_s: 120, target_min: 20 })] }
    expect(swimPlanFrom(data)).toEqual({ rest_s: 120, target_min: 27 })
  })
})

describe('pounds', () => {
  it('converts kg to real gym steps', () => {
    expect(kgToLb(10)).toBe(20) // 22 lb → nearest 5
    expect(kgToLb(5)).toBe(10) // 11 lb → nearest 2.5
    expect(kgToLb(16)).toBe(35)
    expect(kgToLb(6)).toBe(12.5)
  })
})

describe('activity-aware plan', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const log = (d: string, data: any) => ({ id: d + data.sport, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data })

  it('squash yesterday: no "go swim", cardio optional, legs rest', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-20', { sport: 'squash', variant: 'match', minutes: 60 })] }
    const cardio = dayPlan(data, '2026-10-21').find((i) => i.key === 'cardio')!
    expect(cardio.optional).toBe(true)
    expect(cardio.why).toMatch(/Squash yesterday/)
    expect(trainingPlan(data, '2026-10-21').day).not.toBe('C')
  })
  it('any cardio today marks cardio done', () => {
    const data = { ...base(), logs: [log('2026-10-21', { sport: 'squash', variant: 'match', minutes: 45 })] }
    expect(dayPlan(data, '2026-10-21').find((i) => i.key === 'cardio')!.done).toBe(true)
  })
  it('a 21 km hike this week trims Day C to core & posture', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-17', { sport: 'hike', km: 21 })] }
    const p = trainingPlan(data, '2026-10-21')
    expect(p.day).toBe('C')
    expect(p.skip).toEqual(['leg_curl', 'hip_thrust_machine', 'back_ext_45'])
  })
  it('hikes count toward glutes + hams', () => {
    expect(cardioCredit({ id: 'x', user_id: 'u', logged_at: '', local_date: '', type: 'cardio', data: { sport: 'hike', km: 21 } }).posterior).toBe(5)
  })
})

describe('rest times', () => {
  it('base rest, longer after a Hard session, shorter after Easy', () => {
    expect(restAfterSet(EX.db_curl, null, 10)).toBe(75)
    expect(restAfterSet(EX.db_curl, 'hard', 10)).toBe(105)
    expect(restAfterSet(EX.db_curl, 'easy', 10)).toBe(60)
    expect(restAfterSet(EX.dead_bug, null, 60)).toBe(60) // late in a long session: +15
    expect(restBetween(EX.skill_muscleup, null)).toBe(120)
    expect(restBetween(EX.warmup_A, null)).toBe(0)
  })
})

describe('rest days', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const log = (d: string, data: any) => ({ id: d + data.sport, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data })
  it('says rest the day after a 21 km hike', () => {
    const data = { ...base(), logs: [log('2026-10-18', { sport: 'hike', km: 21 })] }
    expect(trainingPlan(data, '2026-10-19').state).toBe('rest')
    expect(tomorrowPreview(data, '2026-10-18')[0]).toMatch(/REST DAY/)
  })
  it('says rest after 5 active days out of 6', () => {
    const data = { ...base(), workouts: ['2026-10-14', '2026-10-15', '2026-10-17', '2026-10-19'].map((d, i) => wo(d, (['A', 'B', 'C', 'A'] as const)[i])),
      logs: [log('2026-10-16', { sport: 'squash', minutes: 60 })] }
    expect(trainingPlan(data, '2026-10-20').state).toBe('rest')
  })
  it('a normal week does not force rest', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'A'), wo('2026-10-17', 'B')] }
    expect(trainingPlan(data, '2026-10-19').state).toBe('go')
  })
})

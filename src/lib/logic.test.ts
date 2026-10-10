import { describe, expect, it } from 'vitest'
import { progress } from './progression'
import { addDays, localDate, weekStart, dow } from './time'
import { habitStats, groupSets, bedMinutes, sleepStats } from './stats'
import { EX } from '../data/program'
import type { HabitEntry, Workout, WorkoutSet } from './types'

describe('progression (7.5)', () => {
  const curl = EX.db_curl // 10–12, step 2
  const knee = EX.hanging_knee_raise // 8–15 bodyweight
  const plank = EX.side_plank // 30–60 s, +5
  const thrust = EX.hip_thrust_machine // maintain

  it('Easy adds 2 reps while in range', () => {
    expect(progress(curl, { weight: 10, reps: 10, targetReps: 10, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 10, reps: 12 })
  })
  it('Easy at the top bumps weight and resets reps', () => {
    expect(progress(curl, { weight: 10, reps: 12, targetReps: 12, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 12, reps: 10 })
  })
  it('Good adds 1 rep, then bumps weight at the top', () => {
    expect(progress(curl, { weight: 10, reps: 11, targetReps: 11, feel: 'good', prevFeel: null })).toMatchObject({ weight: 10, reps: 12 })
    expect(progress(curl, { weight: 10, reps: 12, targetReps: 12, feel: 'good', prevFeel: null })).toMatchObject({ weight: 12, reps: 10 })
  })
  it('Hard keeps, Hard twice drops weight', () => {
    expect(progress(curl, { weight: 12, reps: 10, targetReps: 10, feel: 'hard', prevFeel: 'good' })).toMatchObject({ weight: 12, reps: 10 })
    expect(progress(curl, { weight: 12, reps: 11, targetReps: 11, feel: 'hard', prevFeel: 'hard' })).toMatchObject({ weight: 10, reps: 10 })
  })
  it('missed target is treated as Hard and keeps the target', () => {
    const r = progress(curl, { weight: 12, reps: 9, targetReps: 11, feel: 'easy', prevFeel: null })
    expect(r).toMatchObject({ feel: 'hard', weight: 12, reps: 11 })
  })
  it('bodyweight Easy at the top shows the harder chip', () => {
    expect(progress(knee, { weight: null, reps: 14, targetReps: 14, feel: 'easy', prevFeel: null })).toMatchObject({ reps: 15, harder: true })
  })
  it('timed moves step by 5 s', () => {
    expect(progress(plank, { weight: null, reps: 30, targetReps: 30, feel: 'good', prevFeel: null })).toMatchObject({ reps: 35 })
    expect(progress(plank, { weight: null, reps: 30, targetReps: 30, feel: 'easy', prevFeel: null })).toMatchObject({ reps: 40 })
  })
  it('maintain: only Hard lowers the weight', () => {
    expect(progress(thrust, { weight: 40, reps: 10, targetReps: 10, feel: 'easy', prevFeel: null })).toMatchObject({ weight: 40, reps: 10 })
    expect(progress(thrust, { weight: 40, reps: 10, targetReps: 10, feel: 'hard', prevFeel: null })).toMatchObject({ weight: 35, reps: 10 })
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
  it('bedtimes after midnight average correctly', () => {
    // 23:30 and 00:30 local → average 00:00 (1440)
    const rows = [
      { id: '1', user_id: 'u', wake_date: '2026-10-10', bed_at: '2026-10-10T03:30:00Z', wake_at: null, minutes: 480 },
      { id: '2', user_id: 'u', wake_date: '2026-10-11', bed_at: '2026-10-11T04:30:00Z', wake_at: null, minutes: 420 },
    ]
    expect(bedMinutes(rows[0].bed_at)).toBe(23 * 60 + 30)
    expect(sleepStats(rows).avgBed).toBe(1440)
    expect(sleepStats(rows).bedSpread).toBe(30)
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
  it('best streak looks at gaps between positive days', () => {
    expect(habitStats([e('2026-09-01', 1), e('2026-09-20', 1), e('2026-10-08', 1)], '2026-10-10').best).toBe(18)
  })
})

describe('muscle credit (7.4)', () => {
  it('skill sessions and sets credit their groups', () => {
    const w: Workout = { id: 'w', user_id: 'u', local_date: '2026-10-10', day_code: 'A', started_at: '', ended_at: null, skill_key: 'muscleup', skill_done: true, skill_minutes: 20, ended_early: false }
    const s = (key: string, skipped = false): WorkoutSet => ({ id: key, workout_id: 'w', user_id: 'u', position: 0, exercise_key: key, name_used: key, sets: EX[key].sets, reps: 10, weight_kg: 10, feel: 'good', skipped, next_weight_kg: null, next_reps: null })
    const g = groupSets([w], [s('db_curl'), s('db_oh_triceps'), s('db_lateral', true)])
    expect(g.arms).toBe(2 + 3 + 3)
    expect(g.pull).toBe(4)
    expect(g.shoulders).toBe(0)
  })
})

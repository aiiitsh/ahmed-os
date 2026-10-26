import { byCategory, byWhat, cleanTag } from './focustags'
import { describe, expect, it } from 'vitest'
import { progress } from './progression'
import { addDays, localDate, weekStart, dow } from './time'
import { habitStats, groupSets } from './stats'
import { trainingPlan, swimTarget, proteinOn, dayPlan, tomorrowPreview } from './plan'
import { cardioCredit } from './activity'
import { generateWeekPlan } from './weekplan'
import { restAfterSet, restBetween } from './rest'
import { kgToLb } from './format'
import type { Data } from './store'
import { DAYS, EX } from '../data/program'
import type { HabitEntry, Task, Workout, WorkoutSet } from './types'
import { sortTasks, tasksForToday } from './tasks'
import { countdownText, daysToNext, nextStep, parsePlan, quranTrack, stepColor, stepState, timelinePct } from './life'

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
  it('weeks start on Monday', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26') // Mon
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // Sun
    expect(weekStart('2026-11-02')).toBe('2026-11-02') // next Mon
    expect(dow(weekStart('2026-03-04'))).toBe(1)
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
  it('stats only look at the last 4 weeks', () => {
    const s = habitStats([e('2026-08-01', 3), e('2026-09-01', 2)], '2026-10-10')
    expect(s.times).toBe(0)
    expect(s.avgPerWeek).toBe(0)
    expect(s.cleanDays).toBe(28)
    const t = habitStats([e('2026-09-01', 2), e('2026-10-03', 1), e('2026-10-09', 2)], '2026-10-10')
    expect(t.times).toBe(3)
    expect(t.perWeek).toEqual([0, 0, 1, 2])
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

describe('swim distance', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const swim = (d: string, meters: number, target_m: number) => ({ id: d, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data: { sport: 'swim', minutes: 35, meters, target_m } })
  it('starts at 800 m', () => expect(swimTarget(base())).toBe(800))
  it('adds 100 m after making the target', () => expect(swimTarget({ ...base(), logs: [swim('2026-11-01', 800, 800)] })).toBe(900))
  it('repeats the target when short of it', () => expect(swimTarget({ ...base(), logs: [swim('2026-11-01', 700, 900)] })).toBe(900))
  it('caps at 1,500 m', () => expect(swimTarget({ ...base(), logs: [swim('2026-11-01', 1500, 1500)] })).toBe(1500))
})

describe('protein', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const p = (d: string, g: number, id: string) => ({ id, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'protein' as const, data: { g } })
  it('adds up the day', () => {
    const data = { ...base(), logs: [p('2026-10-26', 30, 'a'), p('2026-10-26', 45, 'b'), p('2026-10-25', 99, 'c')] }
    expect(proteinOn(data, '2026-10-26')).toBe(75)
    expect(dayPlan(data, '2026-10-26').find((i) => i.key === 'protein')).toMatchObject({ sub: '75 / 125 g today', done: false })
  })
})

describe('dynamic plan', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C' | 'D') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const log = (d: string, data: any) => ({ id: d + data.sport, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data })

  it('picks the day never done (C)', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')] }
    expect(trainingPlan(data, '2026-10-19')).toMatchObject({ state: 'go', day: 'C' })
  })
  it('skips Day C the day after a long hike', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-18', { sport: 'hike', km: 21, minutes: 330 })] }
    const p = trainingPlan(data, '2026-10-19')
    expect(p.day).toBe('D') // C waits, D has never been done
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
  const wo = (d: string, code: 'A' | 'B' | 'C' | 'D') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const log = (d: string, data: any) => ({ id: d + data.sport, user_id: 'u', logged_at: `${d}T15:00:00Z`, local_date: d, type: 'cardio' as const, data })

  it('squash yesterday: no cardio nudge today, legs rest', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-20', { sport: 'squash', variant: 'match', minutes: 60 })] }
    expect(dayPlan(data, '2026-10-21').find((i) => i.key === 'cardio')).toBeUndefined()
    expect(trainingPlan(data, '2026-10-21').day).not.toBe('C')
  })
  it('any cardio today marks cardio done', () => {
    const data = { ...base(), logs: [log('2026-10-21', { sport: 'squash', variant: 'match', minutes: 45 })] }
    expect(dayPlan(data, '2026-10-21').find((i) => i.key === 'cardio')!.done).toBe(true)
  })
  it('a 21 km hike this week trims Day C to core & posture', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')], logs: [log('2026-10-19', { sport: 'hike', km: 21 })] }
    const p = trainingPlan(data, '2026-10-22')
    expect(p.day).toBe('C')
    expect(p.skip).toEqual(['leg_ext', 'step_down', 'leg_curl'])
  })
  it('Day C never loads the glutes', () => {
    expect(DAYS.C.keys).not.toContain('hip_thrust_machine')
    expect(DAYS.C.keys.filter((k) => EX[k].kind === 'weighted' && k !== 'suitcase_carry')).toEqual(['leg_ext', 'leg_curl'])
  })
  it('hikes count toward glutes + hams', () => {
    expect(cardioCredit({ id: 'x', user_id: 'u', logged_at: '', local_date: '', type: 'cardio', data: { sport: 'hike', km: 21 } }).posterior).toBe(5)
  })
})

describe('rest times', () => {
  it('base rest, longer after a Hard session, shorter after Easy', () => {
    expect(restAfterSet(EX.incline_curl, null, 10)).toBe(75)
    expect(restAfterSet(EX.incline_curl, 'hard', 10)).toBe(105)
    expect(restAfterSet(EX.incline_curl, 'easy', 10)).toBe(60)
    expect(restAfterSet(EX.dead_bug, null, 60)).toBe(60) // late in a long session: +15
    expect(restBetween(EX.skill_muscleup, null)).toBe(120)
    expect(restBetween(EX.warmup_A, null)).toBe(0)
  })
})

describe('rest days', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C' | 'D') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
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

describe('weekly plan', () => {
  const base = (): Data => ({ appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [] })
  const wo = (d: string, code: 'A' | 'B' | 'C' | 'D') => ({ id: d + code, user_id: 'u', local_date: d, day_code: code, started_at: `${d}T21:00:00Z`, ended_at: `${d}T22:00:00Z`, skill_key: null, skill_done: false, skill_minutes: null, ended_early: false })
  const withPlan = (data: Data, plan: any): Data => ({ ...data, appState: { user_id: 'u', rotation_next: 'A', skills: {}, french_unit: 1, pending_bed_at: null, focus: null, active_session: null, streak_pin_hash: null, settings: { week_plans: { [plan.week_start]: plan } } } })

  it('plans Mon A · Tue C · Wed rest · Thu B · Fri rest · Sat D · Sun swim', () => {
    const data = { ...base(), workouts: [wo('2026-10-15', 'B'), wo('2026-10-16', 'A')] }
    const p = generateWeekPlan(data, '2026-10-26')
    expect(p.days).toEqual([
      { kind: 'gym', day: 'A' }, { kind: 'gym', day: 'C' }, { kind: 'rest' }, { kind: 'gym', day: 'B' },
      { kind: 'rest' }, { kind: 'gym', day: 'D' }, { kind: 'swim' },
    ])
  })
  it('Monday after a Sunday swim is still Day A', () => {
    const data = { ...withPlan(base(), generateWeekPlan(base(), '2026-10-26')), logs: [{ id: 's', user_id: 'u', logged_at: '2026-10-25T15:00:00Z', local_date: '2026-10-25', type: 'cardio' as const, data: { sport: 'swim', minutes: 45, intensity: 'intense', rest_s: 45 } }] }
    expect(trainingPlan(data, '2026-10-26')).toMatchObject({ state: 'go', day: 'A' })
    expect(trainingPlan(data, '2026-10-28')).toMatchObject({ state: 'rest' })
    expect(trainingPlan(data, '2026-11-01')).toMatchObject({ state: 'off' })
  })
  it('a planned Day C after a surprise squash game switches to upper body', () => {
    const plan = { week_start: '2026-10-26', created_at: '', why: [], days: [{ kind: 'rest' }, { kind: 'gym', day: 'C' }, { kind: 'rest' }, { kind: 'gym', day: 'B' }, { kind: 'rest' }, { kind: 'gym', day: 'D' }, { kind: 'swim' }] }
    const data = { ...withPlan(base(), plan), logs: [{ id: 's', user_id: 'u', logged_at: '2026-10-26T15:00:00Z', local_date: '2026-10-26', type: 'cardio' as const, data: { sport: 'squash', minutes: 40 } }] }
    const p = trainingPlan(data, '2026-10-27')
    expect(p.day).not.toBe('C')
    expect(p.why).toMatch(/Plan said Day C/)
  })
})

describe('tasks', () => {
  const t = (id: string, due: string | null, extra: Partial<Task> = {}): Task => ({ id, title: id, due, created_at: '2026-10-20T12:00:00Z', ...extra })
  it('today shows tasks due today, tomorrow or late; not later or undated', () => {
    const list = [t('late', '2026-10-22'), t('today', '2026-10-24'), t('tmrw', '2026-10-25'), t('later', '2026-10-28'), t('nodate', null)]
    expect(tasksForToday(list, '2026-10-24').map((x) => x.id)).toEqual(['late', 'today', 'tmrw'])
  })
  it('moved to tomorrow hides it today and shows it tomorrow', () => {
    const list = [t('a', '2026-10-25', { plan_on: '2026-10-25' })]
    expect(tasksForToday(list, '2026-10-24')).toHaveLength(0)
    expect(tasksForToday(list, '2026-10-25')).toHaveLength(1)
  })
  it('done tasks leave the list; undated sort last', () => {
    expect(tasksForToday([t('d', '2026-10-24', { done_at: '2026-10-24T15:00:00Z' })], '2026-10-24')).toHaveLength(0)
    expect(sortTasks([t('n', null), t('x', '2026-11-01')]).map((x) => x.id)).toEqual(['x', 'n'])
  })
})

describe('focus categories', () => {
  const blk = (id: string, start: string, end: string, type: 'focus' | 'break' = 'focus') =>
    ({ id, user_id: 'u', local_date: '2026-10-24', block_type: type, kind: 'work', started_at: start, ended_at: end, end_reason: 'stop' }) as const
  const blocks = [
    blk('a', '2026-10-24T14:00:00Z', '2026-10-24T15:00:00Z'),
    blk('b', '2026-10-24T15:00:00Z', '2026-10-24T15:30:00Z', 'break'),
    blk('c', '2026-10-24T15:30:00Z', '2026-10-24T16:00:00Z'),
    blk('d', '2026-10-24T16:00:00Z', '2026-10-24T16:20:00Z'),
  ]
  const settings = { focus_tags: { a: { cat: 'Study', what: 'Physics' }, c: { cat: 'Afflo', what: 'physics' } } }

  it('splits focus minutes by category; breaks and untagged handled', () => {
    expect(byCategory([...blocks], settings).map((c) => [c.name, Math.round(c.min)])).toEqual([['Study', 60], ['Afflo', 30], ['No category', 20]])
  })
  it('groups what you worked on, ignoring case', () => {
    expect(byWhat([...blocks], settings).map((c) => [c.name, Math.round(c.min), c.blocks])).toEqual([['Physics', 90, 2]])
  })
  it('drops empty labels', () => {
    expect(cleanTag({ cat: null, what: '  ', task: null })).toBeNull()
    expect(cleanTag({ cat: 'Farq', what: ' plan ' })).toEqual({ cat: 'Farq', what: 'plan' })
  })
})

describe('life plan', () => {
  const step = (tag: string, due: string | null) => ({ id: tag, tag, text: '', details: '', due })
  const plan = { current: 0, steps: [step('Now', '2026-09-20'), step('Next', '2027-08-31'), step('Later', '2036-03-07')] }

  it('counts days to the step after the current one', () => {
    expect(nextStep(plan)?.tag).toBe('Next')
    expect(daysToNext(plan, '2027-08-01')).toBe(30)
    expect(daysToNext({ ...plan, current: 2 }, '2027-08-01')).toBeNull()
  })
  it('marks steps done / now / next / later', () => {
    expect([0, 1, 2].map((i) => stepState({ ...plan, current: 1 }, i))).toEqual(['done', 'now', 'next'])
  })
  it('timeline runs from the first to the last dated step', () => {
    expect(timelinePct(plan, '2026-09-20')).toBe(0)
    expect(timelinePct(plan, '2040-01-01')).toBe(1)
  })
  it('countdown reads in days, months or years', () => {
    expect(countdownText(10)).toBe('10 days')
    expect(countdownText(300)).toBe('10 months')
    expect(countdownText(-3)).toBe('3 days late')
  })
  it('parses pasted JSON and rejects junk', () => {
    let n = 0
    const p = parsePlan('{"current":9,"steps":[{"tag":"A","text":"نص","due":"2027-08-31"},{"due":"soon"}]}', () => `id${++n}`)
    expect(p.current).toBe(1)
    expect(p.steps[0]).toMatchObject({ tag: 'A', text: 'نص', due: '2027-08-31' })
    expect(p.steps[1]).toMatchObject({ tag: 'Step 2', due: null })
    expect(() => parsePlan('nope', () => 'x')).toThrow('Not valid JSON')
    expect(() => parsePlan('{"steps":[]}', () => 'x')).toThrow('No steps found')
  })
})

describe('life plan board', () => {
  const plan = parsePlan(JSON.stringify({
    road: { stages: [['Masters'], ['A', 'B'], []], note: 'n' },
    steps: [
      { tag: 'Current state', text: 'x', details: 'حافظ 3 اجزاء' },
      { tag: 'Mid-Journey', text: 'y', details: 'حافظ نص القرآن', color: '#123456' },
      { tag: 'Final Target', text: 'z', details: 'حافظ القرآن كاملا' },
    ],
  }), () => 'id')
  it('keeps the road and custom colours', () => {
    expect(plan.road).toEqual({ stages: [['Masters'], ['A', 'B']], note: 'n', aside: undefined })
    expect(stepColor(plan.steps[1], 1)).toBe('#123456')
    expect(stepColor(plan.steps[2], 2)).toBe('#9747ff')
  })
  it('reads the Quran juz goals from the steps', () => {
    expect(quranTrack(plan).map((x) => x.juz)).toEqual([3, 15, 30])
  })
})

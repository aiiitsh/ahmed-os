// Section 7.5: the app decides the next target from what was done and how it felt.
import { repStep, type Exercise } from '../data/program'
import type { Feel } from './types'

export interface ProgressInput {
  weight: number | null
  reps: number
  targetReps: number
  feel: Feel
  prevFeel: Feel | null
}

export interface ProgressResult {
  weight: number | null
  reps: number
  /** effective feel after the missed-target rule */
  feel: Feel
  /** bodyweight move maxed out on Easy */
  harder?: boolean
}

const round = (n: number) => Math.round(n * 100) / 100

export function progress(ex: Exercise, inp: ProgressInput): ProgressResult {
  const { prevFeel } = inp
  let w = inp.weight
  let r = inp.reps
  const feel: Feel = inp.reps < inp.targetReps ? 'hard' : inp.feel

  if (ex.kind === 'stretch' || ex.kind === 'skill') return { weight: w, reps: r, feel }

  const weighted = ex.kind === 'weighted' && w != null
  const { lo, hi, step } = ex

  if (ex.maintain) {
    if (feel === 'hard' && w != null) w = Math.max(step, round(w - step))
    return { weight: w, reps: hi, feel }
  }

  const inc = repStep(ex)
  const wStep = ex.kind === 'weighted' ? step : 0

  if (feel === 'easy') {
    if (r + 2 * inc <= hi) r += 2 * inc
    else if (weighted) { w = round(w! + wStep); r = lo }
    else return { weight: w, reps: hi, feel, harder: true }
  } else if (feel === 'good') {
    if (r + inc <= hi) r += inc
    else if (weighted) { w = round(w! + wStep); r = lo }
    else r = hi
  } else {
    if (prevFeel === 'hard' && weighted) { w = Math.max(wStep, round(w! - wStep)); r = lo }
    else r = Math.max(r, inp.targetReps) // keep: repeat the target
  }
  return { weight: w, reps: r, feel }
}

// ---------- swim: 25 m sprint front, rest, 25 m sprint back, rest ----------

export interface SwimDone {
  minutes: number
  rest_s: number
  intensity: 'easy' | 'moderate' | 'intense'
}

/**
 * Next session's rest between 25 m sprints and how long to aim to last.
 * The goal is lasting longer: hit the target → aim 2 min longer; felt easy → rest less.
 * Moderate and on target also trims 5 s, so rest comes down gradually from what you actually used.
 */
export function nextSwim(cur: { rest_s: number; target_min: number }, done: SwimDone) {
  const hit = done.minutes >= cur.target_min
  let rest = done.rest_s
  if (done.intensity === 'easy') rest -= 10
  else if (done.intensity === 'moderate' && hit) rest -= 5
  else if (done.intensity === 'intense' && !hit) rest += 5
  rest = Math.max(15, Math.min(150, rest))
  const target_min = hit ? done.minutes + 2 : Math.max(cur.target_min, done.minutes + 1)
  return { rest_s: rest, target_min }
}

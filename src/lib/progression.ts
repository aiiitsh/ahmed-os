// Section 7.5: the app decides the next target from what was done and how it felt.
import type { Exercise } from '../data/program'
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

  const inc = ex.kind === 'timed' ? step : 1
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

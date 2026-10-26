// What each activity outside the gym works, so it counts toward muscles and shapes the plan.
import type { Group, Log } from './types'

export const WORKS: Record<string, string> = {
  swim: 'back, shoulders and core, plus cardio',
  hike: 'legs, plus cardio',
  run: 'legs, plus cardio',
  squash: 'legs, shoulders and core, plus cardio',
}

const half = (n: number) => Math.round(n * 2) / 2

/** Muscle "sets" credited by a cardio session (roughly what a gym exercise of similar load would give). */
export function cardioCredit(l: Log): Partial<Record<Group, number>> {
  if (l.type !== 'cardio') return {}
  const d = l.data
  const min = Number(d.minutes) || 0
  switch (d.sport) {
    case 'swim': {
      if (min < 10) return {}
      const k = Math.min(1.5, min / 20) * (d.intensity === 'intense' ? 1.2 : d.intensity === 'easy' ? 0.7 : 1)
      return { pull: half(2 * k), shoulders: half(2 * k), core: half(2 * k) }
    }
    case 'hike': {
      const km = Number(d.km) || 0
      if (km < 4) return {}
      return { posterior: half(Math.min(5, km / 4)), core: 1 }
    }
    case 'run':
      return min < 20 ? {} : { posterior: min >= 45 ? 3 : 2, core: 0.5 }
    case 'squash':
      return min < 20 ? {} : { posterior: 2, shoulders: 1, core: 1 }
  }
  return {}
}

export const sportLabel = (s: string) => ({ swim: 'Swim', hike: 'Hike', run: 'Run', squash: 'Squash' } as Record<string, string>)[s] ?? s

export function describeCardio(l: Log): string {
  const d = l.data
  if (d.sport === 'hike') return `Hike ${d.km} km`
  if (d.sport === 'swim' && d.meters) return `Swim ${d.meters} m`
  return `${sportLabel(d.sport)} ${d.minutes} min`
}

/** Rough effort score of one activity (a full gym session is about 3). */
export function activityLoad(l: Log): number {
  if (l.type !== 'cardio') return 0
  const d = l.data
  const min = Number(d.minutes) || 0
  switch (d.sport) {
    case 'hike': return Math.max((Number(d.km) || 0) / 4, min / 60)
    case 'run': return min / 20
    case 'squash': return min / 20
    case 'swim': return Math.min(2, min / 20) // slow technique swims are close to recovery
  }
  return 0
}

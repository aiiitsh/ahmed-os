// Home "Today's plan": what to do today, and what's already done.
import { DAYS, GOALS } from '../data/program'
import type { Data } from './store'
import type { DayCode } from './types'
import { addDays, localDate } from './time'
import { focusStats } from './stats'
import { dueJuz } from '../components/Quran'

export type PlanAction =
  | { kind: 'session'; day: DayCode }
  | { kind: 'sheet'; sheet: 'swim' | 'routine' | 'quran' | 'french' | 'focus' }

export interface PlanItem {
  key: string
  icon: string
  title: string
  sub: string
  done: boolean
  action?: PlanAction
}

export interface TrainingPlan {
  state: 'done' | 'rest' | 'go'
  day: DayCode
  doneDay?: DayCode
}

/** Train today unless already done, or you trained both of the last two days (then recover). */
export function trainingPlan(data: Data, today = localDate()): TrainingPlan {
  const day = data.appState?.rotation_next ?? 'A'
  const on = (d: string) => data.workouts.filter((w) => w.local_date === d)
  const todays = on(today)
  if (todays.length) return { state: 'done', day, doneDay: todays[todays.length - 1].day_code }
  if (on(addDays(today, -1)).length && on(addDays(today, -2)).length) return { state: 'rest', day }
  return { state: 'go', day }
}

export function todayPlan(data: Data, today = localDate()): PlanItem[] {
  const logs = data.logs.filter((l) => l.local_date === today)
  const swim = data.appState?.settings?.swim
  const items: PlanItem[] = []

  items.push({
    key: 'routine', icon: 'hollow', title: 'Core & posture routine', sub: '6 min · dead bug, bird dog, bridge, stretches',
    done: logs.some((l) => l.type === 'stretch' && l.data.which === 'daily_routine'),
    action: { kind: 'sheet', sheet: 'routine' },
  })

  const swamToday = logs.find((l) => l.type === 'cardio' && l.data.sport === 'swim')
  items.push({
    key: 'swim', icon: 'swim', title: 'Swim · 25 m sprints',
    sub: swamToday ? `✓ ${swamToday.data.minutes} min · ${swamToday.data.intensity ?? ''}` : `Rest ${swim?.rest_s ?? 45} s between 25s · aim ${swim?.target_min ?? 20} min`,
    done: !!swamToday, action: { kind: 'sheet', sheet: 'swim' },
  })

  const due = dueJuz(data.juz, 1)[0]
  items.push({
    key: 'quran', icon: 'quran', title: 'Quran', sub: due ? `Revise juz ${due}` : 'Revise or memorize',
    done: logs.some((l) => l.type === 'quran'), action: { kind: 'sheet', sheet: 'quran' },
  })

  const frMin = logs.filter((l) => l.type === 'french').reduce((a, l) => a + (l.data.minutes || 0), 0)
  items.push({
    key: 'french', icon: 'french', title: 'French', sub: frMin ? `✓ ${frMin} min today` : `Unit ${data.appState?.french_unit ?? 1} · 30 min`,
    done: frMin >= 30, action: { kind: 'sheet', sheet: 'french' },
  })

  const fo = focusStats(data.focus.filter((b) => b.local_date === today))
  const focusGoal = Math.round((GOALS.focusHours / 5) * 60)
  items.push({
    key: 'focus', icon: 'focus', title: 'Focus', sub: `${Math.round(fo.total)} / ${focusGoal} min today`,
    done: fo.total >= focusGoal, action: data.appState?.focus ? undefined : { kind: 'sheet', sheet: 'focus' },
  })

  return items
}

export const dayName = (d: DayCode) => DAYS[d].name

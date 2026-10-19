// The daily plan adapts to what you actually did: which training day is most overdue,
// whether yesterday's hike/run means legs should rest, whether you swam yesterday, etc.
import { DAYS, GOALS, SWIM_DEFAULT } from '../data/program'
import type { Data } from './store'
import type { DayCode, Log } from './types'
import { addDays, daysBetween, localDate } from './time'
import { focusStats } from './stats'
import { nextSwim } from './progression'

export type PlanAction =
  | { kind: 'session'; day: DayCode }
  | { kind: 'sheet'; sheet: 'swim' | 'routine' | 'quran' | 'french' | 'focus' | 'hike' }

export interface PlanItem {
  key: string
  icon: string
  title: string
  sub: string
  /** why it's suggested today */
  why?: string
  done: boolean
  optional?: boolean
  action?: PlanAction
}

export interface TrainingPlan {
  state: 'done' | 'rest' | 'go'
  day: DayCode
  doneDay?: DayCode
  why: string
}

const isCardio = (l: Log, sport: string) => l.type === 'cardio' && l.data.sport === sport
const onDay = (logs: Log[], d: string) => logs.filter((l) => l.local_date === d)

/** Legs need a break after a long hike, a long run, or Day C. */
function legsTired(data: Data, d: string): string | null {
  const y = onDay(data.logs, d)
  const hike = y.find((l) => isCardio(l, 'hike'))
  if (hike && (Number(hike.data.km) >= 10 || Number(hike.data.minutes) >= 150)) return `you hiked ${hike.data.km ?? '?'} km`
  const run = y.find((l) => isCardio(l, 'run') && Number(l.data.minutes) >= 45)
  if (run) return `you ran ${run.data.minutes} min`
  if (data.workouts.some((w) => w.local_date === d && w.day_code === 'C')) return 'you did legs (Day C)'
  return null
}

/** Next swim: derived from the last logged swim (rest actually used + how it felt), so it self-corrects. */
export function swimPlanFrom(data: Data) {
  const last = [...data.logs].filter((l) => isCardio(l, 'swim') && l.data.rest_s != null && l.data.intensity)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at)).at(-1)
  if (!last) return data.appState?.settings?.swim ?? SWIM_DEFAULT
  return nextSwim(
    { rest_s: Number(last.data.rest_s), target_min: Number(last.data.target_min ?? last.data.minutes) },
    { minutes: Number(last.data.minutes), rest_s: Number(last.data.rest_s), intensity: last.data.intensity },
  )
}

/**
 * Which training day to do on `d`: the most overdue of A/B/C (never done first),
 * skipping Day C when legs are tired, and suggesting recovery after two days in a row.
 */
export function trainingPlan(data: Data, d = localDate()): TrainingPlan {
  const before = data.workouts.filter((w) => w.local_date < d)
  const last = (code: DayCode) => before.filter((w) => w.day_code === code).map((w) => w.local_date).sort().at(-1) ?? null
  const order = (['A', 'B', 'C'] as DayCode[]).map((code) => ({ code, last: last(code) }))
    .sort((a, b) => (a.last === b.last ? 0 : a.last == null ? -1 : b.last == null ? 1 : a.last.localeCompare(b.last)))
  const tired = legsTired(data, addDays(d, -1))
  let pick = order[0]
  if (tired && pick.code === 'C') pick = order[1]
  const why = pick.last == null
    ? `Day ${pick.code} hasn't been done yet`
    : `Day ${pick.code} is the most overdue (last ${daysBetween(pick.last, d)} days ago)`
  const todays = data.workouts.filter((w) => w.local_date === d)
  if (todays.length) return { state: 'done', day: order[0].code, doneDay: todays[todays.length - 1].day_code, why: 'Done for today.' }
  const trained = (x: string) => data.workouts.some((w) => w.local_date === x)
  if (trained(addDays(d, -1)) && trained(addDays(d, -2))) {
    return { state: 'rest', day: pick.code, why: 'You trained the last 2 days. Recover: core routine, maybe an easy swim.' }
  }
  const skippedC = !!tired && order[0].code === 'C'
  return { state: 'go', day: pick.code, why: skippedC ? `Day C waits: ${tired} yesterday. Upper body instead.` : why }
}

export function dayPlan(data: Data, d = localDate()): PlanItem[] {
  const logs = onDay(data.logs, d)
  const yesterday = onDay(data.logs, addDays(d, -1))
  const items: PlanItem[] = []

  // Core & posture routine: every day.
  items.push({
    key: 'routine', icon: 'hollow', title: 'Core & posture routine', sub: '6 min · dead bug, bird dog, bridge, stretches',
    why: 'Every day. This is what fixes the pelvic tilt and makes you sit and walk tall.',
    done: logs.some((l) => l.type === 'stretch' && l.data.which === 'daily_routine'),
    action: { kind: 'sheet', sheet: 'routine' },
  })

  // Swim: suggested when it's been a while; optional the day after a swim; good recovery after a hike.
  const swimToday = logs.find((l) => isCardio(l, 'swim'))
  const lastSwim = data.logs.filter((l) => isCardio(l, 'swim') && l.local_date < d).map((l) => l.local_date).sort().at(-1)
  const since = lastSwim ? daysBetween(lastSwim, d) : null
  const plan = swimPlanFrom(data)
  const hikedYesterday = yesterday.some((l) => isCardio(l, 'hike'))
  items.push({
    key: 'swim', icon: 'swim', title: 'Swim · 25 m sprints',
    sub: swimToday ? `✓ ${swimToday.data.minutes} min · ${swimToday.data.intensity ?? ''}` : `Rest ${plan.rest_s} s between 25s · aim ${plan.target_min} min`,
    why: swimToday ? undefined
      : hikedYesterday ? 'Easy swim is great recovery after yesterday’s hike.'
      : since === 1 ? 'You swam yesterday. Optional today.'
      : since == null ? 'If you can get to the pool today.'
      : `Last swim ${since} days ago. Go if you can.`,
    done: !!swimToday, optional: since === 1, action: { kind: 'sheet', sheet: 'swim' },
  })

  // Focus.
  const fo = focusStats(data.focus.filter((b) => b.local_date === d))
  const focusGoal = Math.round((GOALS.focusHours / 5) * 60)
  items.push({
    key: 'focus', icon: 'focus', title: 'Deep focus', sub: `${Math.round(fo.total)} / ${focusGoal} min today`,
    done: fo.total >= focusGoal, action: data.appState?.focus ? undefined : { kind: 'sheet', sheet: 'focus' },
  })

  // Quran and French: no targets. Doing them is good; skipping isn't bad.
  const q = data.quran.filter((e) => e.local_date === d)
  items.push({
    key: 'quran', icon: 'quran', title: 'Quran', sub: q.length ? `✓ ${q.length} today` : 'Learn, memorize or revise a surah',
    done: q.length > 0, optional: true, action: { kind: 'sheet', sheet: 'quran' },
  })
  const frMin = logs.filter((l) => l.type === 'french').reduce((a, l) => a + (l.data.minutes || 0), 0)
  items.push({
    key: 'french', icon: 'french', title: 'French', sub: frMin ? `✓ ${frMin} min today` : 'Any amount counts',
    done: frMin > 0, optional: true, action: { kind: 'sheet', sheet: 'french' },
  })

  return items
}

/** Short "tomorrow" preview from what's actually logged so far today. */
export function tomorrowPreview(data: Data, today = localDate()): string[] {
  const t = addDays(today, 1)
  const tp = trainingPlan(data, t)
  const out: string[] = []
  out.push(tp.state === 'rest' ? 'Recovery day: core routine + easy swim' : `Day ${tp.day} · ${DAYS[tp.day].name}`)
  const swamToday = data.logs.some((l) => l.local_date === today && isCardio(l, 'swim'))
  out.push(swamToday ? 'Swim optional (you swam today)' : 'Swim if you can')
  const tired = legsTired(data, today)
  if (tired) out.push(`Legs rest: ${tired} today`)
  return out
}

export const dayName = (d: DayCode) => DAYS[d].name

// The daily plan adapts to what you actually did: which training day is most overdue, what your
// hikes, runs, squash and swims already worked, and when you need recovery.
import { DAYS, EX, GOALS, SWIM_DEFAULT } from '../data/program'
import type { Data } from './store'
import type { DayCode, Log } from './types'
import { addDays, daysBetween, localDate, weekStart } from './time'
import { focusStats } from './stats'
import { nextSwim } from './progression'
import { WORKS, activityLoad, describeCardio, sportLabel } from './activity'
import { SLOT_LABEL, slotOn } from './weekplan'
import type { PlanSlot } from './types'

export type PlanAction =
  | { kind: 'session'; day: DayCode }
  | { kind: 'sheet'; sheet: 'swim' | 'routine' | 'quran' | 'french' | 'focus' | 'hike' | 'cardio' }

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
  /** off = a planned non-gym day (cardio) */
  state: 'done' | 'rest' | 'go' | 'off'
  day: DayCode
  doneDay?: DayCode
  why: string
  /** steps to leave out today (e.g. leg machines when a hike already covered legs) */
  skip: string[]
  note?: string
  /** today's slot in the weekly plan, if there is one */
  slot?: PlanSlot | null
}

const isCardio = (l: Log, sport?: string) => l.type === 'cardio' && (!sport || l.data.sport === sport)
const onDay = (logs: Log[], d: string) => logs.filter((l) => l.local_date === d)
const LEG_KEYS = DAYS.C.keys.filter((k) => EX[k].legs)

/** Legs need a break the day after a long hike, a long run, squash, or Day C (and 2 days after a 15 km+ hike). */
function legsTired(data: Data, d: string): string | null {
  const y = onDay(data.logs, d)
  const hike = y.find((l) => isCardio(l, 'hike'))
  if (hike && (Number(hike.data.km) >= 10 || Number(hike.data.minutes) >= 150)) return `you hiked ${hike.data.km ?? '?'} km yesterday`
  const run = y.find((l) => isCardio(l, 'run') && Number(l.data.minutes) >= 45)
  if (run) return `you ran ${run.data.minutes} min yesterday`
  const sq = y.find((l) => isCardio(l, 'squash') && Number(l.data.minutes) >= 30)
  if (sq) return `you played squash yesterday`
  if (data.workouts.some((w) => w.local_date === d && w.day_code === 'C')) return 'you did legs yesterday'
  const big = onDay(data.logs, addDays(d, -1)).find((l) => isCardio(l, 'hike') && Number(l.data.km) >= 15)
  if (big) return `your ${big.data.km} km hike was 2 days ago`
  return null
}

/** A big hike (15 km+) or two long runs/squash games this week already trained your legs. */
function legsCoveredThisWeek(data: Data, d: string): string | null {
  const ws = weekStart(d)
  const wk = data.logs.filter((l) => l.local_date >= ws && l.local_date < d && isCardio(l))
  const km = wk.filter((l) => isCardio(l, 'hike')).reduce((a, l) => a + (Number(l.data.km) || 0), 0)
  if (km >= 15) return `your ${km} km of hiking this week covered legs`
  const legDays = wk.filter((l) => (isCardio(l, 'run') || isCardio(l, 'squash')) && Number(l.data.minutes) >= 45).length
  if (legDays >= 2) return `${legDays} long runs/squash games this week covered legs`
  return null
}

/** Yesterday's hard swim already worked back and shoulders. */
function pullTired(data: Data, d: string): string | null {
  const swim = onDay(data.logs, d).find((l) => isCardio(l, 'swim') && l.data.intensity === 'intense' && Number(l.data.minutes) >= 25)
  return swim ? 'yesterday’s hard swim worked your back and shoulders' : null
}

/** Effort score for a day: a gym session is ~3, a 21 km hike ~5, a 60 min squash game ~3. */
export function dayLoad(data: Data, d: string): number {
  const gym = data.workouts.filter((w) => w.local_date === d).length * 3
  return gym + onDay(data.logs, d).reduce((a, l) => a + activityLoad(l), 0)
}

/** Should today be a rest day? Returns the reason, or null. */
export function restReason(data: Data, d: string): string | null {
  const y = dayLoad(data, addDays(d, -1))
  const y2 = dayLoad(data, addDays(d, -2))
  if (y >= 5) {
    const hike = onDay(data.logs, addDays(d, -1)).find((l) => isCardio(l, 'hike'))
    return hike
      ? `Ahmed, rest today. A ${hike.data.km} km hike is a huge day; training on top of it leaves you flat for days. Just the 6-min routine and an easy walk.`
      : 'Ahmed, rest today. Yesterday was a very big day; let your body recover so you come back stronger.'
  }
  if (y >= 3 && y2 >= 3) return 'Ahmed, rest today. Two hard days in a row: recovery is where you get stronger. Routine + easy walk only.'
  const active = [1, 2, 3, 4, 5, 6].filter((k) => dayLoad(data, addDays(d, -k)) >= 2).length
  if (active >= 5) return `Ahmed, rest today. You were active ${active} of the last 6 days; take a full day off to avoid burning out.`
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
 * Which training day to do on `d`: the most overdue of A/B/C (never done first), avoiding the day whose
 * muscles yesterday's activity already worked, trimming Day C to core & posture when legs are covered
 * this week, and suggesting recovery after two hard days in a row.
 */
export function trainingPlan(data: Data, d = localDate()): TrainingPlan {
  const before = data.workouts.filter((w) => w.local_date < d)
  const last = (code: DayCode) => before.filter((w) => w.day_code === code).map((w) => w.local_date).sort().at(-1) ?? null
  const order = (['A', 'B', 'C'] as DayCode[]).map((code) => ({ code, last: last(code) }))
    .sort((a, b) => (a.last === b.last ? 0 : a.last == null ? -1 : b.last == null ? 1 : a.last.localeCompare(b.last)))

  const todays = data.workouts.filter((w) => w.local_date === d)
  if (todays.length) return { state: 'done', day: order[0].code, doneDay: todays[todays.length - 1].day_code, why: 'Done for today.', skip: [] }

  const legs = legsTired(data, addDays(d, -1))
  const pull = pullTired(data, addDays(d, -1))
  const blocked = (c: DayCode) => (c === 'C' && legs) || (c === 'A' && pull)
  const rest = restReason(data, d)
  const slot = slotOn(data, d)

  // Weekly plan: rest and cardio days come straight from it.
  if (slot && slot.kind === 'rest') {
    return { state: 'rest', day: order[0].code, why: rest ?? 'Planned rest day. Recovery is where you get stronger: gentle posture reset and a walk, nothing more.', skip: [], slot }
  }
  if (slot && slot.kind !== 'gym') {
    if (rest) return { state: 'rest', day: order[0].code, why: `Plan said ${SLOT_LABEL[slot.kind].toLowerCase()}, but: ${rest}`, skip: [], slot }
    return { state: 'off', day: order[0].code, why: `${SLOT_LABEL[slot.kind]} day in this week's plan. No gym today.`, skip: [], slot }
  }
  // Planned gym day: use the planned A/B/C unless yesterday already worked those muscles.
  if (slot?.day) {
    const planned = order.find((o) => o.code === slot.day)!
    order.splice(order.indexOf(planned), 1)
    order.unshift(planned)
  }
  const pick = order.find((o) => !blocked(o.code)) ?? order[0]
  const top = order[0]

  let why = slot?.day ? `Day ${pick.code} is in this week's plan`
    : pick.last == null ? `Day ${pick.code} hasn't been done yet`
    : `Day ${pick.code} is the most overdue (last ${daysBetween(pick.last, d)} days ago)`
  if (pick.code !== top.code) {
    why = top.code === 'C' ? `${slot?.day ? 'Plan said Day C' : 'Day C waits'}: ${legs}. ${pick.code === 'A' ? 'Pull & arms' : 'Push & core'} instead.`
      : `${slot?.day ? 'Plan said Day A' : 'Day A waits'}: ${pull}. Day ${pick.code} instead.`
  }

  // Day C after a week of hiking: keep the core & posture work, drop the leg machines.
  let skip: string[] = []
  let note: string | undefined
  const covered = pick.code === 'C' ? legsCoveredThisWeek(data, d) : null
  if (covered) {
    skip = LEG_KEYS
    note = `Core & posture only: ${covered}`
    why += `. ${covered[0].toUpperCase()}${covered.slice(1)}, so today is core & posture only.`
  }

  if (rest) return { state: 'rest', day: pick.code, why: slot ? `Plan said Day ${pick.code}, but: ${rest}` : rest, skip, note, slot }
  return { state: 'go', day: pick.code, why, skip, note, slot }
}

export function dayPlan(data: Data, d = localDate()): PlanItem[] {
  const logs = onDay(data.logs, d)
  const yesterday = onDay(data.logs, addDays(d, -1))
  const items: PlanItem[] = []

  // Posture every day: inside the session on gym days, a gentle 8-min reset on other days.
  const slot = slotOn(data, d)
  const trainedToday = data.workouts.some((w) => w.local_date === d)
  const routineDone = logs.some((l) => l.type === 'stretch' && l.data.which === 'daily_routine')
  if (trainedToday || slot?.kind === 'gym') {
    items.push({
      key: 'routine', icon: 'hollow', title: 'Posture', sub: 'In your warm-up and cool-down today',
      why: trainedToday ? undefined : 'Done as part of the gym session: no extra stretching needed.',
      done: trainedToday || routineDone,
    })
  } else {
    items.push({
      key: 'routine', icon: 'hollow', title: 'Posture reset', sub: '8 min · gentle · activation + light stretches',
      why: 'Every non-gym day. Gentle (4/10), so it fixes posture without leaving you sore.',
      done: routineDone, action: { kind: 'sheet', sheet: 'routine' },
    })
  }

  // Cardio: any activity counts. Suggest a swim only when nothing was done lately.
  const cardioToday = logs.filter((l) => isCardio(l))
  const cardioYesterday = yesterday.filter((l) => isCardio(l))
  const lastCardio = data.logs.filter((l) => isCardio(l) && l.local_date < d).map((l) => l.local_date).sort().at(-1)
  const since = lastCardio ? daysBetween(lastCardio, d) : null
  const plan = swimPlanFrom(data)
  let why: string | undefined
  let optional = false
  const resting = !!restReason(data, d) || slot?.kind === 'rest'
  const plannedCardio = slot && slot.kind !== 'gym' && slot.kind !== 'rest' ? slot.kind : null
  if (!cardioToday.length) {
    if (resting) { optional = true; why = 'Rest day: an easy walk or a gentle swim at most.' }
    else if (plannedCardio) why = `Planned for today: ${SLOT_LABEL[plannedCardio].toLowerCase()}${plannedCardio === 'cardio' ? ' (run, hike, squash or swim)' : ''}.`
    else if (slot) { optional = true; why = 'Not planned today. Only if you feel like it.' }
    else if (cardioYesterday.length) {
      const y = cardioYesterday[0]
      optional = true
      why = y.data.sport === 'hike'
        ? `You hiked yesterday (${WORKS.hike}). Rest, or an easy swim to loosen up.`
        : `${sportLabel(y.data.sport)} yesterday already worked ${WORKS[y.data.sport] ?? 'you'}. Optional today.`
    } else if (since == null) why = 'Swim if you can get to the pool, or any cardio you like.'
    else if (since >= 2) why = `Last cardio ${since} days ago. Swim if you can.`
    else { optional = true; why = 'Optional today.' }
  }
  items.push({
    key: 'cardio', icon: cardioToday[0]?.data.sport === 'hike' ? 'hike' : cardioToday[0]?.data.sport ?? 'swim',
    title: cardioToday.length ? 'Cardio' : plannedCardio ? `${SLOT_LABEL[plannedCardio]} · planned` : 'Cardio · swim',
    sub: cardioToday.length ? `✓ ${cardioToday.map(describeCardio).join(' · ')}` : `25 m sprints · rest ${plan.rest_s} s · aim ${plan.target_min} min`,
    why, done: cardioToday.length > 0, optional, action: { kind: 'sheet', sheet: 'cardio' },
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
  out.push(tp.state === 'rest' ? 'REST DAY: routine + easy walk only. Don’t train.'
    : tp.state === 'off' ? `${SLOT_LABEL[tp.slot!.kind]} day (no gym)`
    : `Day ${tp.day} · ${DAYS[tp.day].name}${tp.skip.length ? ' (core & posture only)' : ''}`)
  const cardioToday = onDay(data.logs, today).filter((l) => isCardio(l))
  if (tp.state !== 'off') out.push(cardioToday.length ? `Cardio optional (you did ${cardioToday.map(describeCardio).join(', ')} today)` : tp.slot ? 'No cardio planned' : 'Swim if you can')
  const tired = legsTired(data, today)
  if (tired) out.push(`Legs rest: ${tired.replace(' yesterday', ' today')}`)
  return out
}

export const dayName = (d: DayCode) => DAYS[d].name

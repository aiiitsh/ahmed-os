// The daily plan adapts to what you actually did: which training day is most overdue, what your
// hikes, runs, squash and swims already worked, and when you need recovery.
import { DAYS, DAY_ORDER, EX, GOALS, PROTEIN_G, SWIM } from '../data/program'
import type { Data } from './store'
import type { DayCode, Log } from './types'
import { addDays, daysBetween, dow, localDate, weekStart } from './time'
import { QURAN_AMOUNTS, amountLabel, isQuranCheckin, quranStreak } from './qurandaily'
import { focusStats } from './stats'
import { activityLoad, describeCardio } from './activity'
import { SLOT_LABEL, slotOn } from './weekplan'
import type { PlanSlot } from './types'

export type PlanAction =
  | { kind: 'session'; day: DayCode }
  | { kind: 'sheet'; sheet: 'swim' | 'routine' | 'quran' | 'quranDaily' | 'french' | 'focus' | 'hike' | 'cardio' | 'protein' }
  | { kind: 'life' }

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
      ? `Ahmed, rest today. A ${hike.data.km} km hike is a huge day; training on top of it leaves you flat for days. An easy walk at most.`
      : 'Ahmed, rest today. Yesterday was a very big day; let your body recover so you come back stronger.'
  }
  if (y >= 3 && y2 >= 3) return 'Ahmed, rest today. Two hard days in a row: recovery is where you get stronger. An easy walk at most.'
  const active = [1, 2, 3, 4, 5, 6].filter((k) => dayLoad(data, addDays(d, -k)) >= 2).length
  if (active >= 5) return `Ahmed, rest today. You were active ${active} of the last 6 days; take a full day off to avoid burning out.`
  return null
}

/** Next swim distance: last swim's metres + 100 when you swam at least the target (up to 1,500 m). */
export function swimTarget(data: Data): number {
  const last = [...data.logs].filter((l) => isCardio(l, 'swim') && Number(l.data.meters) > 0)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at)).at(-1)
  if (!last) return SWIM.start_m
  const m = Number(last.data.meters)
  const tgt = Number(last.data.target_m) || SWIM.start_m
  return Math.min(SWIM.max_m, m >= tgt ? m + SWIM.step_m : tgt)
}

/** Today's protein, grams. */
export function proteinOn(data: Data, d: string): number {
  return onDay(data.logs, d).filter((l) => l.type === 'protein').reduce((a, l) => a + (Number(l.data.g) || 0), 0)
}
export const proteinGoal = (data: Data) => data.appState?.settings?.protein_g ?? PROTEIN_G

/**
 * Which training day to do on `d`: the most overdue of A/B/C (never done first), avoiding the day whose
 * muscles yesterday's activity already worked, trimming Day C to core & posture when legs are covered
 * this week, and suggesting recovery after two hard days in a row.
 */
export function trainingPlan(data: Data, d = localDate()): TrainingPlan {
  const before = data.workouts.filter((w) => w.local_date < d)
  const last = (code: DayCode) => before.filter((w) => w.day_code === code).map((w) => w.local_date).sort().at(-1) ?? null
  const order = (DAY_ORDER as DayCode[]).map((code) => ({ code, last: last(code) }))
    .sort((a, b) => (a.last === b.last ? 0 : a.last == null ? -1 : b.last == null ? 1 : a.last.localeCompare(b.last)))

  const todays = data.workouts.filter((w) => w.local_date === d)
  if (todays.length) return { state: 'done', day: order[0].code, doneDay: todays[todays.length - 1].day_code, why: 'Done for today.', skip: [] }

  const legs = legsTired(data, addDays(d, -1))
  const blocked = (c: DayCode) => c === 'C' && !!legs
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
    why = `${slot?.day ? 'Plan said Day C' : 'Day C waits'}: ${legs}. Day ${pick.code} (${DAYS[pick.code].name}) instead.`
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
  const items: PlanItem[] = []

  // Stretches live inside the gym session. Rest days are real rest: nothing to do.
  const slot = slotOn(data, d)
  const trainedToday = data.workouts.some((w) => w.local_date === d)
  if (trainedToday || slot?.kind === 'gym') {
    items.push({
      key: 'routine', icon: 'hollow', title: 'Stretches', sub: 'In your warm-up and cool-down today',
      why: trainedToday ? undefined : 'Part of the gym session: no extra stretching needed.',
      done: trainedToday,
    })
  }

  // Swim on its planned day (slow and long). Anything else only shows once it's logged.
  const cardioToday = logs.filter((l) => isCardio(l))
  const swimDay = slot?.kind === 'swim' || slot?.kind === 'cardio'
  if (cardioToday.length) {
    items.push({
      key: 'cardio', icon: cardioToday[0].data.sport ?? 'swim', title: cardioToday.some((l) => l.data.sport === 'swim') ? 'Swim' : 'Cardio',
      sub: `✓ ${cardioToday.map(describeCardio).join(' · ')}`, done: true, action: { kind: 'sheet', sheet: 'cardio' },
    })
  } else if (swimDay) {
    const resting = restReason(data, d)
    items.push({
      key: 'cardio', icon: 'swim', title: 'Swim · planned', sub: `${swimTarget(data)} m slow · 30–40 min · freestyle + backstroke`,
      why: resting ? `${resting} Skip the swim or keep it very easy.` : 'Slow and long, for posture. If you get out more tired than you got in, it was too hard.',
      done: false, optional: !!resting, action: { kind: 'sheet', sheet: 'swim' },
    })
  }

  // Protein: the one food number to track.
  const g = proteinOn(data, d)
  const goal = proteinGoal(data)
  items.push({
    key: 'protein', icon: 'protein', title: 'Protein', sub: `${g} / ${goal} g today`,
    why: g >= goal ? undefined : 'About 30 g at each of 4 meals.',
    done: g >= goal, action: { kind: 'sheet', sheet: 'protein' },
  })

  // Focus.
  const fo = focusStats(data.focus.filter((b) => b.local_date === d))
  const focusGoal = Math.round((GOALS.focusHours / 5) * 60)
  items.push({
    key: 'focus', icon: 'focus', title: 'Deep focus', sub: `${Math.round(fo.total)} / ${focusGoal} min today`,
    done: fo.total >= focusGoal, action: data.appState?.focus ? undefined : { kind: 'sheet', sheet: 'focus' },
  })

  // Quran: a daily check-in, like protein. Any amount makes the day done.
  const q = logs.filter(isQuranCheckin)
  const streak = quranStreak(data.logs, d)
  items.push({
    key: 'quran', icon: 'quran', title: 'Quran',
    sub: q.length ? `✓ ${q.map((l) => amountLabel(l.data.amount)).join(' + ')}${streak > 1 ? ` · ${streak}-day streak` : ''}`
      : `${QURAN_AMOUNTS.map(([, label]) => label.toLowerCase()).join(', ')}${streak ? ` · ${streak}-day streak` : ''}`,
    done: q.length > 0, action: { kind: 'sheet', sheet: 'quranDaily' },
  })

  // Saturdays: read the whole life plan once a week.
  if (dow(d) === 6) {
    const read = !!data.appState?.settings?.plan_reads?.includes(d)
    items.push({
      key: 'plan_read', icon: 'life', title: 'Read my full plan', sub: read ? '✓ Read today' : 'Every Saturday · opens the Life screen',
      done: read, action: { kind: 'life' },
    })
  }

  // French: no target. Doing it is good; skipping isn't bad.
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
  out.push(tp.state === 'rest' ? 'REST DAY: an easy walk at most. Don’t train.'
    : tp.state === 'off' ? `${SLOT_LABEL[tp.slot!.kind]} day (no gym)`
    : `Day ${tp.day} · ${DAYS[tp.day].name}${tp.skip.length ? ' (core & posture only)' : ''}`)
  const cardioToday = onDay(data.logs, today).filter((l) => isCardio(l))
  if (tp.state === 'off' && tp.slot?.kind === 'swim') out.push(`${swimTarget(data)} m slow, in the morning`)
  else if (tp.state === 'go' && tp.day !== 'D' && tp.slot) out.push('After work: snack at 16:00, gym around 17:45')
  if (cardioToday.length && tp.state === 'go' && tp.day === 'C') out.push(`Legs check: you did ${cardioToday.map(describeCardio).join(', ')} today`)
  const tired = legsTired(data, today)
  if (tired) out.push(`Legs rest: ${tired.replace(' yesterday', ' today')}`)
  return out
}

export const dayName = (d: DayCode) => DAYS[d].name

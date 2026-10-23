// Weekly plan, made on Saturday from last week's data: gym days (A/B/C), cardio, swim and rest days.
// You can change any day. Surprise activities are logged as usual and shape next week's plan.
import { DAYS } from '../data/program'
import type { Data } from './store'
import type { DayCode, PlanSlot, SlotKind, WeekPlan } from './types'
import { addDays, daysBetween, dow, weekStart } from './time'
import { activityLoad } from './activity'

export const SLOT_LABEL: Record<SlotKind, string> = {
  gym: 'Gym', swim: 'Swim', run: 'Run', hike: 'Hike', squash: 'Squash', cardio: 'Cardio', rest: 'Rest',
}
export const SLOT_ICON: Record<SlotKind, string> = {
  gym: 'dumbbell', swim: 'swim', run: 'run', hike: 'hike', squash: 'squash', cardio: 'run', rest: 'bed',
}
export const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
/** Activities that load the legs (Day C should not come the day after). */
export const LEG_SLOTS = new Set<SlotKind>(['run', 'hike', 'squash', 'cardio'])

export const slotText = (s: PlanSlot) => (s.kind === 'gym' ? `Day ${s.day}` : SLOT_LABEL[s.kind])

export function planFor(data: Data, ws: string): WeekPlan | null {
  return data.appState?.settings?.week_plans?.[ws] ?? null
}

export function slotOn(data: Data, d: string): PlanSlot | null {
  const ws = weekStart(d)
  return planFor(data, ws)?.days[daysBetween(ws, d)] ?? null
}

/** Index in a Sat→Fri week for a date. */
const weekIdx = (d: string) => (dow(d) + 1) % 7

const dayLoad = (data: Data, d: string) =>
  data.workouts.filter((w) => w.local_date === d).length * 3 + data.logs.filter((l) => l.local_date === d).reduce((a, l) => a + activityLoad(l), 0)

/** Give A/B/C to the three gym slots: most overdue first, no Day C after leg cardio, no Day A right after a swim. */
export function assignGymDays(data: Data, ws: string, kinds: SlotKind[]): DayCode[] {
  const gymIdx = kinds.map((k, i) => (k === 'gym' ? i : -1)).filter((i) => i >= 0)
  const last = (c: DayCode) => data.workouts.filter((w) => w.day_code === c && w.local_date < ws).map((w) => w.local_date).sort().at(-1) ?? ''
  const rank = (['A', 'B', 'C'] as DayCode[]).sort((a, b) => last(a).localeCompare(last(b))) // never/oldest first
  const perms: DayCode[][] = [['A', 'B', 'C'], ['A', 'C', 'B'], ['B', 'A', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B'], ['C', 'B', 'A']]
  let best: DayCode[] = rank
  let bestScore = Infinity
  for (const p of perms) {
    let score = 0
    p.slice(0, gymIdx.length).forEach((code, k) => {
      const i = gymIdx[k]
      const prev = i > 0 ? kinds[i - 1] : null
      score += rank.indexOf(code) * k
      if (code === 'C' && prev && LEG_SLOTS.has(prev)) score += 10
      if (code === 'A' && prev === 'swim') score += 3
    })
    if (score < bestScore) { bestScore = score; best = p }
  }
  return best.slice(0, gymIdx.length)
}

/** Build the plan for the week starting `ws` (a Saturday) from what happened before it. */
export function generateWeekPlan(data: Data, ws: string): WeekPlan {
  const prev = addDays(ws, -7)
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(prev, i))
  const sessions = data.workouts.filter((w) => w.local_date >= prev && w.local_date < ws).length
  const cardio = data.logs.filter((l) => l.type === 'cardio' && l.local_date >= prev && l.local_date < ws)
  const loads = prevDays.map((d) => dayLoad(data, d))
  const restDays = loads.filter((x) => x < 1).length
  let stacked = 0
  for (let i = 1; i < 7; i++) if (loads[i] >= 3 && loads[i - 1] >= 3) stacked++

  // Template: Sat free cardio · Sun gym · Mon swim · Tue gym · Wed rest · Thu gym · Fri rest.
  const kinds: SlotKind[] = ['cardio', 'gym', 'swim', 'gym', 'rest', 'gym', 'rest']
  // Swim goes on the non-gym weekday you've actually swum most (last 3 weeks).
  const swimCounts = [2, 4, 6].map((i) => ({
    i, n: data.logs.filter((l) => l.type === 'cardio' && l.data.sport === 'swim' && l.local_date >= addDays(ws, -21) && l.local_date < ws && weekIdx(l.local_date) === i).length,
  }))
  const topSwim = swimCounts.sort((a, b) => b.n - a.n)[0]
  if (topSwim.n > 0 && topSwim.i !== 2) { kinds[2] = 'rest'; kinds[topSwim.i] = 'swim' }
  // Keep at least one rest day after the swim if it moved to Wed; Fri stays rest unless it's the swim day.

  const codes = assignGymDays(data, ws, kinds)
  let k = 0
  const days: PlanSlot[] = kinds.map((kind) => (kind === 'gym' ? { kind, day: codes[k++] } : { kind }))

  const why: string[] = []
  why.push(`Last week: ${sessions} gym session${sessions === 1 ? '' : 's'}, ${cardio.length} cardio, ${restDays} real rest day${restDays === 1 ? '' : 's'}.`)
  if (sessions < 2) why.push('Few sessions last week, so 3 are planned and nothing more. Showing up beats doing a lot.')
  if (stacked > 0 || restDays < 2) why.push('You stacked hard days last week, so this week has 2 full rest days. Recovery is where you get stronger.')
  const first = days.find((s) => s.kind === 'gym')!
  const lastFirst = data.workouts.filter((w) => w.day_code === first.day && w.local_date < ws).map((w) => w.local_date).sort().at(-1)
  why.push(`Day ${first.day} comes first: ${lastFirst ? `last done ${daysBetween(lastFirst, ws)} days ago` : "it hasn't been done yet"}.`)
  why.push('Saturday is your free cardio day (run, hike or squash: change it if you know). Day C never comes right after it, so legs are fresh.')
  if (topSwim.n > 0) why.push(`Swim on ${WEEKDAYS[days.findIndex((s) => s.kind === 'swim')]}: that's when you usually swim.`)
  why.push('Posture every day: inside the warm-up and cool-down on gym days, an 8-min gentle reset on the other days.')
  return { week_start: ws, created_at: new Date().toISOString(), days, why }
}

/** Did the day go as planned? 'done' | 'missed' | 'pending' | 'rest-broken' */
export function slotStatus(data: Data, d: string, slot: PlanSlot, today: string): 'done' | 'missed' | 'pending' {
  const gym = data.workouts.filter((w) => w.local_date === d)
  const cardio = data.logs.filter((l) => l.local_date === d && l.type === 'cardio')
  let ok: boolean
  if (slot.kind === 'gym') ok = gym.length > 0
  else if (slot.kind === 'rest') ok = d < today && gym.length === 0 && dayLoad(data, d) < 2
  else if (slot.kind === 'cardio') ok = cardio.length > 0
  else ok = cardio.some((l) => l.data.sport === slot.kind)
  if (ok) return 'done'
  return d < today ? 'missed' : 'pending'
}

/** Anything done that day that wasn't in the plan (e.g. a surprise hike). */
export function unplanned(data: Data, d: string, slot: PlanSlot): string[] {
  const out: string[] = []
  for (const l of data.logs.filter((x) => x.local_date === d && x.type === 'cardio')) {
    if (slot.kind !== 'cardio' && slot.kind !== l.data.sport) out.push(SLOT_LABEL[l.data.sport as SlotKind] ?? l.data.sport)
  }
  if (slot.kind !== 'gym' && data.workouts.some((w) => w.local_date === d)) out.push('Gym')
  return out
}

export const dayLabel = (s: PlanSlot) => (s.kind === 'gym' ? `Gym · Day ${s.day} · ${DAYS[s.day!].name}` : SLOT_LABEL[s.kind])

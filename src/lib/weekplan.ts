// Weekly plan, Monday to Sunday: 4 gym days (A/B/C/D), 1 slow swim, 2 full rest days.
// You can change any day. Squash, hikes and runs are not planned: if you do one, it replaces the swim.
import { DAYS } from '../data/program'
import type { Data } from './store'
import type { PlanSlot, SlotKind, WeekPlan } from './types'
import { addDays, daysBetween, weekStart } from './time'
import { activityLoad } from './activity'

export const SLOT_LABEL: Record<SlotKind, string> = {
  gym: 'Gym', swim: 'Swim', run: 'Run', hike: 'Hike', squash: 'Squash', cardio: 'Cardio', rest: 'Rest',
}
export const SLOT_ICON: Record<SlotKind, string> = {
  gym: 'dumbbell', swim: 'swim', run: 'run', hike: 'hike', squash: 'squash', cardio: 'run', rest: 'bed',
}
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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

const dayLoad = (data: Data, d: string) =>
  data.workouts.filter((w) => w.local_date === d).length * 3 + data.logs.filter((l) => l.local_date === d).reduce((a, l) => a + activityLoad(l), 0)

/**
 * The fixed week: Mon A (pull + arms) · Tue C (legs) · Wed rest · Thu B (push + arms) · Fri rest · Sat D (size) · Sun swim.
 * Weekday sessions are after work; Saturday and Sunday are in the morning, before any weekend work.
 */
export const WEEK_TEMPLATE: PlanSlot[] = [
  { kind: 'gym', day: 'A' }, { kind: 'gym', day: 'C' }, { kind: 'rest' }, { kind: 'gym', day: 'B' },
  { kind: 'rest' }, { kind: 'gym', day: 'D' }, { kind: 'swim' },
]

/** Build the plan for the week starting `ws` (a Monday). */
export function generateWeekPlan(data: Data, ws: string): WeekPlan {
  const prev = addDays(ws, -7)
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(prev, i))
  const sessions = data.workouts.filter((w) => w.local_date >= prev && w.local_date < ws).length
  const cardio = data.logs.filter((l) => l.type === 'cardio' && l.local_date >= prev && l.local_date < ws)
  const restDays = prevDays.map((d) => dayLoad(data, d)).filter((x) => x < 1).length

  const days: PlanSlot[] = WEEK_TEMPLATE.map((s) => ({ ...s }))
  const why: string[] = []
  why.push(`Last week: ${sessions} gym session${sessions === 1 ? '' : 's'}, ${cardio.length} cardio, ${restDays} real rest day${restDays === 1 ? '' : 's'}.`)
  why.push('4 gym days: upper body 3× a week (A, B, D) because that is where you want size; legs once (C) for strength and knee alignment, not size.')
  why.push('Weekdays after work (snack at 16:00, gym around 17:45). Saturday gym and Sunday swim in the morning, before any weekend work.')
  why.push('Wednesday and Friday are full rest days. Recovery is where you get bigger.')
  why.push('Sunday swim is slow and long: technique and posture, distance goes up 100 m a week. No sprints.')
  why.push('All stretching is inside the warm-ups and cool-downs. Nothing extra on rest days.')
  why.push('Squash, hikes and runs are not planned. If you really want one, it replaces the swim, never stacks on top.')
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

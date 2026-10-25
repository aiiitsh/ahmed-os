// Life plan: where Ahmed is on the long road, and how far the next step is.
import type { LifePlan, LifeStep } from './types'
import { daysBetween, localDate } from './time'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export function currentIndex(plan: LifePlan): number {
  return clamp(plan.current ?? 0, 0, Math.max(0, plan.steps.length - 1))
}

/** The step Ahmed is working toward: the one after where he is now. */
export function nextStep(plan: LifePlan): LifeStep | null {
  return plan.steps[currentIndex(plan) + 1] ?? null
}

/** Days until the next step's date (negative = late), or null without a date. */
export function daysToNext(plan: LifePlan, today = localDate()): number | null {
  const n = nextStep(plan)
  return n?.due ? daysBetween(today, n.due) : null
}

/** How much of the whole timeline (first dated step → last dated step) has passed, 0..1. */
export function timelinePct(plan: LifePlan, today = localDate()): number | null {
  const dated = plan.steps.map((s) => s.due).filter((d): d is string => !!d).sort()
  if (dated.length < 2) return null
  const total = daysBetween(dated[0], dated[dated.length - 1])
  return total > 0 ? clamp(daysBetween(dated[0], today) / total, 0, 1) : null
}

export function stepState(plan: LifePlan, i: number): 'done' | 'now' | 'next' | 'later' {
  const c = currentIndex(plan)
  return i < c ? 'done' : i === c ? 'now' : i === c + 1 ? 'next' : 'later'
}

export function dueText(d: string | null): string {
  if (!d) return 'No date'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function countdownText(days: number | null): string {
  if (days == null) return ''
  if (days < 0) return `${-days} days late`
  if (days === 0) return 'today'
  if (days < 60) return `${days} days`
  const months = Math.round(days / 30.44)
  return months < 24 ? `${months} months` : `${(days / 365.25).toFixed(1)} years`
}

/** Read a plan pasted as JSON. Throws with a short reason if it isn't one. */
export function parsePlan(raw: string, makeId: () => string): LifePlan {
  let v: any
  try { v = JSON.parse(raw) } catch { throw new Error('Not valid JSON') }
  if (!v || !Array.isArray(v.steps) || !v.steps.length) throw new Error('No steps found')
  const str = (x: any) => (typeof x === 'string' ? x : '')
  const date = (x: any) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null)
  const steps: LifeStep[] = v.steps.map((s: any, i: number) => ({
    id: str(s?.id) || makeId(),
    tag: str(s?.tag) || `Step ${i + 1}`,
    text: str(s?.text),
    details: str(s?.details),
    due: date(s?.due),
    ...(str(s?.note) ? { note: str(s.note) } : {}),
  }))
  return {
    reminder: str(v.reminder) || undefined,
    principles: Array.isArray(v.principles) ? v.principles.map(str).filter(Boolean) : undefined,
    steps,
    current: clamp(Number.isInteger(v.current) ? v.current : 0, 0, steps.length - 1),
  }
}

/** Plain-text block for the review with Claude. */
export function lifeText(plan: LifePlan, today = localDate()): string[] {
  const c = currentIndex(plan)
  const n = nextStep(plan)
  const L = [`Now: step ${c + 1}/${plan.steps.length} · ${plan.steps[c]?.tag ?? ''}`]
  if (n) L.push(`Next: ${n.tag}${n.due ? ` by ${dueText(n.due)} (${countdownText(daysToNext(plan, today))})` : ''}`, n.text, n.details)
  return L.filter(Boolean)
}

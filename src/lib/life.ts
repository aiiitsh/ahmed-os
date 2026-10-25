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
    ...(/^#[0-9a-f]{6}$/i.test(str(s?.color)) ? { color: str(s.color) } : {}),
  }))
  const stages = Array.isArray(v.road?.stages) ? v.road.stages.map((r: any) => (Array.isArray(r) ? r.map(str).filter(Boolean) : [])).filter((r: string[]) => r.length) : []
  return {
    reminder: str(v.reminder) || undefined,
    principles: Array.isArray(v.principles) ? v.principles.map(str).filter(Boolean) : undefined,
    steps,
    ...(stages.length ? { road: { stages, note: str(v.road.note) || undefined, aside: str(v.road.aside) || undefined } } : {}),
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

/** Board colours (FigJam palette), by step name; anything else cycles through the palette. */
const NAMED: Record<string, string> = {
  'current state': '#1e1e1e', 'next step': '#f24822', experience: '#ffc943', 'break-even': '#14ae5c',
  'mid-journey': '#0d99ff', prefinals: '#0d99ff', 'final target': '#9747ff',
}
const PALETTE = ['#1e1e1e', '#f24822', '#ffc943', '#14ae5c', '#0d99ff', '#0d99ff', '#9747ff']

export function stepColor(s: LifeStep, i: number): string {
  return s.color ?? NAMED[s.tag.trim().toLowerCase()] ?? PALETTE[i % PALETTE.length]
}

/** Light cards (yellow) need dark text. */
export function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 165
}

/** Bullet lines of a multi-line field. */
export const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean)

/** Quran juz per step, read from the details ("حافظ 6 اجزاء", "حافظ نص القرآن", "حافظ القرآن ... كاملا"). */
export function quranTrack(plan: LifePlan): { step: LifeStep; juz: number }[] {
  const out: { step: LifeStep; juz: number }[] = []
  for (const s of plan.steps) {
    const t = `${s.text}\n${s.details}`
    const n = t.match(/حافظ\s+(\d+)\s*(?:اجز|جز)/)
    const juz = n ? Number(n[1]) : /حافظ\s+نص\s+القر/.test(t) ? 15 : /حافظ\s+القر[^\n]*كامل/.test(t) ? 30 : null
    if (juz) out.push({ step: s, juz })
  }
  return out
}

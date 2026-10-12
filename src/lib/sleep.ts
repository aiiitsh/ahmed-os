// Sleep is a list of segments (Sleep → Woke up). This groups them into nights, wake-ups and naps.
import type { SleepSeg } from './types'
import { localDate, localMinutes, minutesBetween } from './time'

export const WAKE_REASONS: [string, string][] = [['pee', 'Pee'], ['no_reason', 'No reason'], ['noise', 'Noise'], ['other', 'Other']]
export const WAKE_LABEL = Object.fromEntries(WAKE_REASONS)

export const segMinutes = (s: SleepSeg): number | null =>
  s.start_at ? Math.max(0, Math.round(minutesBetween(s.start_at, s.end_at))) : null

/** A daytime sleep under 4 h that starts 09:00–19:00. */
export function isNap(s: SleepSeg): boolean {
  if (!s.start_at) return false
  const m = localMinutes(s.start_at)
  return m >= 9 * 60 && m < 19 * 60 && (segMinutes(s) ?? 0) < 240
}

/**
 * The day a segment counts toward. Night sleep belongs to the morning it ends on
 * (shifted 6 h so a 23:50 wake-up counts toward the next morning). Naps belong to their own day.
 */
export function sleepDay(s: SleepSeg): string {
  if (isNap(s)) return localDate(s.start_at!)
  return localDate(new Date(s.end_at).getTime() + 6 * 3600000)
}

/** Nighttime wake-up (where the reason chips make sense). */
export function isNightWake(iso: string): boolean {
  const m = localMinutes(iso)
  return m >= 21 * 60 || m < 6 * 60
}

export interface Night {
  date: string
  segments: SleepSeg[]
  naps: SleepSeg[]
  /** minutes asleep at night (segments with a known start) */
  asleep: number
  bed: string | null
  wake: string | null
  /** times woken up during the night (gaps between night segments) */
  wakings: number
  /** minutes awake in those gaps */
  awake: number
  reasons: string[]
  napMinutes: number
}

export function groupNights(segs: SleepSeg[]): Night[] {
  const by = new Map<string, Night>()
  const get = (d: string) => {
    let n = by.get(d)
    if (!n) by.set(d, (n = { date: d, segments: [], naps: [], asleep: 0, bed: null, wake: null, wakings: 0, awake: 0, reasons: [], napMinutes: 0 }))
    return n
  }
  const sorted = [...segs].sort((a, b) => (a.start_at ?? a.end_at).localeCompare(b.start_at ?? b.end_at))
  for (const s of sorted) {
    const n = get(sleepDay(s))
    if (isNap(s)) { n.naps.push(s); n.napMinutes += segMinutes(s) ?? 0 } else n.segments.push(s)
  }
  for (const n of by.values()) {
    const seg = n.segments
    n.asleep = seg.reduce((a, s) => a + (segMinutes(s) ?? 0), 0)
    n.bed = seg.find((s) => s.start_at)?.start_at ?? null
    n.wake = seg.length ? seg[seg.length - 1].end_at : null
    n.wakings = Math.max(0, seg.length - 1)
    for (let i = 1; i < seg.length; i++) {
      if (seg[i].start_at) n.awake += Math.max(0, minutesBetween(seg[i - 1].end_at, seg[i].start_at!))
    }
    n.reasons = seg.slice(0, -1).map((s) => s.wake_reason).filter(Boolean) as string[]
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date))
}

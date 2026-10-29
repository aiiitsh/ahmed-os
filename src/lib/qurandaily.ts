// Quran as a daily check-in, like protein: one tap logs today's amount. Any entry makes the day done.
// Stored as logs with type 'quran' and data { amount }. The surah tracker (quran_events) is separate.
import type { Log } from './types'
import { addDays, localDate } from './time'

export type QuranAmount = 'page' | 'half_page' | 'video' | 'half_video'

export const QURAN_AMOUNTS: [QuranAmount, string][] = [
  ['page', 'One page'],
  ['half_page', 'Half page'],
  ['video', 'One YouTube video'],
  ['half_video', 'Half YouTube video'],
]

export const amountLabel = (a: string) => QURAN_AMOUNTS.find(([k]) => k === a)?.[1] ?? a

/** A daily check-in entry (older 'quran' logs from the juz tracker have no amount). */
export const isQuranCheckin = (l: Log) => l.type === 'quran' && !!l.data?.amount

export const checkinDays = (logs: Log[]) => new Set(logs.filter(isQuranCheckin).map((l) => l.local_date))

/** Days in a row with a check-in, ending today (or yesterday, if today isn't done yet). */
export function quranStreak(logs: Log[], today = localDate()): number {
  const days = checkinDays(logs)
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}

/** How many of the `n` days ending today had a check-in. */
export function daysDone(logs: Log[], n: number, today = localDate()): number {
  const days = checkinDays(logs)
  let k = 0
  for (let i = 0; i < n; i++) if (days.has(addDays(today, -i))) k++
  return k
}

/** "One page ×3, One YouTube video ×1" for a set of check-ins. */
export function amountSummary(logs: Log[]): string {
  const c = new Map<string, number>()
  for (const l of logs.filter(isQuranCheckin)) c.set(l.data.amount, (c.get(l.data.amount) ?? 0) + 1)
  return QURAN_AMOUNTS.filter(([k]) => c.has(k)).map(([k, label]) => `${label} ×${c.get(k)}`).join(', ')
}

// ---------- weekly plan read (Saturdays) ----------

/** The Saturday of the Mon–Sun week starting `start`. */
export const saturdayOf = (start: string) => addDays(start, 5)

export function planReadStatus(reads: string[] | undefined, start: string, today = localDate()): 'done' | 'missed' | 'not yet' {
  const sat = saturdayOf(start)
  if (reads?.includes(sat)) return 'done'
  return sat < today ? 'missed' : 'not yet'
}

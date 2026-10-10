import { quranTap, type QuranMode } from '../lib/actions'
import { daysBetween, localDate } from '../lib/time'
import type { Juz } from '../lib/types'

export type Fresh = 'none' | 'fresh' | 'mid' | 'old'

export function freshness(j: Juz | undefined, today = localDate()): Fresh {
  if (!j || !j.memorized) return 'none'
  if (!j.last_revised) return 'old'
  const d = daysBetween(j.last_revised, today)
  return d <= 7 ? 'fresh' : d <= 14 ? 'mid' : 'old'
}

/** The memorized juz with the oldest revision first. */
export function dueJuz(juz: Record<number, Juz>, n = 3): number[] {
  return Object.values(juz)
    .filter((j) => j.memorized)
    .sort((a, b) => (a.last_revised ?? '').localeCompare(b.last_revised ?? '') || a.juz - b.juz)
    .slice(0, n)
    .map((j) => j.juz)
}

export function JuzGrid({ juz, mode, onTap }: { juz: Record<number, Juz>; mode: QuranMode; onTap?: () => void }) {
  const today = localDate()
  return (
    <div className="juz-grid">
      {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
        const f = freshness(juz[n], today)
        return (
          <button key={n} className={`juz ${f}`} onClick={() => { quranTap(n, mode); onTap?.() }}
            aria-label={`Juz ${n}, ${f === 'none' ? 'not memorized' : f}`}>
            {n}
            {f === 'old' && <span className="due" />}
          </button>
        )
      })}
    </div>
  )
}

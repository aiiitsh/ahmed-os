// What focus time goes into. Each focus block can carry a category (Afflo, Study, ...), a short
// "what" and a linked to-do task. Labels live in app_state.settings.focus_tags by block id.
import type { FocusBlock, FocusTag, Settings } from './types'
import { minutesBetween } from './time'

export const DEFAULT_CATEGORIES = ['Afflo', 'Study', 'Planning', 'Farq']
export const NO_CATEGORY = 'No category'

export const categoriesOf = (s?: Settings | null) => s?.focus_categories ?? DEFAULT_CATEGORIES

export const tagOf = (s: Settings | null | undefined, id: string): FocusTag => s?.focus_tags?.[id] ?? {}

/** "Study · Physics lab", "Study", "Physics lab" or "". */
export const tagLabel = (t: FocusTag) => [t.cat, t.what].filter(Boolean).join(' · ')

/** Keep only filled parts; null when nothing is set. */
export function cleanTag(t: FocusTag): FocusTag | null {
  const out: FocusTag = {}
  if (t.cat) out.cat = t.cat
  if (t.what?.trim()) out.what = t.what.trim()
  if (t.task) out.task = t.task
  return Object.keys(out).length ? out : null
}

export interface Share { name: string; min: number; blocks: number }

function group(blocks: FocusBlock[], key: (b: FocusBlock) => string | null): Share[] {
  const m = new Map<string, Share>()
  for (const b of blocks) {
    if (b.block_type !== 'focus') continue
    const k = key(b)
    if (k == null) continue
    const g = m.get(k) ?? { name: k, min: 0, blocks: 0 }
    g.min += minutesBetween(b.started_at, b.ended_at)
    g.blocks++
    m.set(k, g)
  }
  return [...m.values()].sort((a, b) => b.min - a.min)
}

/** Focus minutes per category, biggest first; untagged blocks count as "No category". */
export const byCategory = (blocks: FocusBlock[], s?: Settings | null) =>
  group(blocks, (b) => tagOf(s, b.id).cat || NO_CATEGORY)

/** Focus minutes per thing worked on (free text, case-insensitive), biggest first. */
export function byWhat(blocks: FocusBlock[], s?: Settings | null): Share[] {
  const names = new Map<string, string>()
  return group(blocks, (b) => {
    const w = tagOf(s, b.id).what?.trim()
    if (!w) return null
    const k = w.toLowerCase()
    if (!names.has(k)) names.set(k, w)
    return names.get(k)!
  })
}

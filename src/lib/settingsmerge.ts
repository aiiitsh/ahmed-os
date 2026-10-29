// Settings live in one JSON column. Writing the whole object lets a stale copy (another device, or a
// refresh that landed between two saves) wipe newer edits. So a save carries only the keys it changed,
// with their values before and after, and is merged into the server's current copy just before writing.

export interface SettingsPatch {
  /** changed keys: their value before this edit */
  base: Record<string, any>
  /** changed keys: their value after this edit (missing = key removed) */
  next: Record<string, any>
}

const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)
const isObj = (v: any) => v != null && typeof v === 'object' && !Array.isArray(v)
const hasIds = (v: any) => Array.isArray(v) && v.every((x) => isObj(x) && typeof x.id === 'string')

/** The keys that differ between two settings objects, or null if nothing changed. */
export function diffSettings(prev: Record<string, any>, next: Record<string, any>): SettingsPatch | null {
  const patch: SettingsPatch = { base: {}, next: {} }
  let changed = false
  for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (same(prev[k], next[k])) continue
    changed = true
    if (k in prev) patch.base[k] = prev[k]
    if (k in next) patch.next[k] = next[k]
  }
  return changed ? patch : null
}

/** Lists of {id} (tasks): keep what others added or changed; apply what this edit added, changed or removed. */
function mergeById(base: any[], local: any[], server: any[]): any[] {
  const B = new Map(base.map((x) => [x.id, x]))
  const L = new Map(local.map((x) => [x.id, x]))
  const S = new Set(server.map((x) => x.id))
  const out: any[] = []
  for (const s of server) {
    if (L.has(s.id)) out.push(same(L.get(s.id), B.get(s.id)) ? s : L.get(s.id))
    else if (!B.has(s.id)) out.push(s) // added elsewhere
    // else: removed by this edit
  }
  for (const l of local) {
    if (S.has(l.id)) continue
    if (!B.has(l.id) || !same(l, B.get(l.id))) out.push(l) // added here (or edited here after being removed elsewhere)
  }
  return out
}

/** One key: base = before this edit, local = after it, server = what's saved now. */
function mergeKey(base: any, local: any, server: any): any {
  if (same(base, server)) return local // nobody else touched it
  if (hasIds(local) && hasIds(base ?? []) && hasIds(server ?? [])) return mergeById(base ?? [], local, server ?? [])
  if (isObj(local) && isObj(server) && (base == null || isObj(base))) {
    const b = base ?? {}
    const out = { ...server }
    for (const k of new Set([...Object.keys(b), ...Object.keys(local)])) {
      if (same(b[k], local[k])) continue
      if (k in local) out[k] = local[k]
      else delete out[k]
    }
    return out
  }
  return local // plain values: this edit wins
}

/** Apply this edit's changed keys onto the server's current settings. */
export function mergeSettings(server: Record<string, any> | null | undefined, patch: SettingsPatch): Record<string, any> {
  const out = { ...(server ?? {}) }
  for (const k of new Set([...Object.keys(patch.base), ...Object.keys(patch.next)])) {
    if (!(k in patch.next)) { delete out[k]; continue }
    out[k] = mergeKey(patch.base[k], patch.next[k], out[k])
  }
  return out
}

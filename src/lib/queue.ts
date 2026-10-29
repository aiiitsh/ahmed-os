// Write layer: every write goes through here. If Supabase can't be reached, the op is
// stored in IndexedDB and retried on `online` / app focus, in order.
import { supabase } from './supabase'
import { demoMode } from './demo'
import { mergeSettings, type SettingsPatch } from './settingsmerge'

export type Op =
  | { kind: 'upsert'; table: string; values: Record<string, any> | Record<string, any>[]; onConflict?: string }
  | { kind: 'update'; table: string; values: Record<string, any>; match: Record<string, any> }
  | { kind: 'delete'; table: string; match: Record<string, any> }
  /** app_state settings: only the changed keys, merged into the server's copy right before writing */
  | { kind: 'settings'; table: string; values: Record<string, any>; match: Record<string, any>; patch: SettingsPatch }

interface Stored { seq?: number; op: Op }

const DB = 'ahmed-os'
const STORE = 'queue'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const idbAdd = (op: Op) => tx('readwrite', (s) => s.add({ op } as Stored))
const idbAll = () => tx<Stored[]>('readonly', (s) => s.getAll())
const idbDel = (seq: number) => tx('readwrite', (s) => s.delete(seq))

// --- listeners (header sync dot, store refetch gating) ---
type Listener = (pending: number) => void
const listeners = new Set<Listener>()
let queued = 0
let inflight = 0
const emit = () => listeners.forEach((l) => l(queued + inflight))
export const onPending = (l: Listener) => (listeners.add(l), () => listeners.delete(l))
export const pendingCount = () => queued + inflight

/** Bumped on every write, so a reload that started before it knows its data may be stale. */
let writes = 0
export const writeCount = () => writes

let onError: (msg: string) => void = (m) => console.error(m)
export const setErrorHandler = (fn: (msg: string) => void) => (onError = fn)

export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String(err?.message ?? err ?? '')
  return /fetch|network|load failed|timeout|offline/i.test(msg) || err?.status === 0
}

// Settings writes read-merge-write, one at a time, so two of them never merge onto the same old copy.
let settingsLock: Promise<unknown> = Promise.resolve()

async function runSettings(op: Extract<Op, { kind: 'settings' }>): Promise<void> {
  const cur = await supabase.from(op.table).select('settings').match(op.match).maybeSingle()
  if (cur.error) throw cur.error
  const settings = mergeSettings(cur.data?.settings, op.patch)
  const res = await supabase.from(op.table).update({ ...op.values, settings }).match(op.match)
  if (res.error) throw res.error
}

async function run(op: Op): Promise<void> {
  if (op.kind === 'settings') {
    const p = settingsLock.then(() => runSettings(op))
    settingsLock = p.catch(() => {})
    return p
  }
  const q = supabase.from(op.table)
  let res
  if (op.kind === 'upsert') res = await q.upsert(op.values as any, op.onConflict ? { onConflict: op.onConflict } : undefined)
  else if (op.kind === 'update') res = await q.update(op.values).match(op.match)
  else res = await q.delete().match(op.match)
  if (res.error) throw res.error
}

/** Fire a write. Optimistic: the caller has already updated local state. */
export async function write(op: Op): Promise<void> {
  if (demoMode) return
  writes++
  if (queued > 0) {
    // Keep order: something is already waiting, so this waits behind it.
    await enqueue(op)
    void flush()
    return
  }
  inflight++; emit()
  try {
    await run(op)
  } catch (e: any) {
    if (isNetworkError(e)) await enqueue(op)
    else onError(e?.message || 'Save failed')
  } finally {
    inflight--; emit()
  }
}

async function enqueue(op: Op) {
  try {
    await idbAdd(op)
  } catch {
    memQueue.push(op) // IndexedDB unavailable (private mode): keep in memory
  }
  queued++; emit()
  if (flushing) again = true
}

const memQueue: Op[] = []
let flushing = false
let again = false

export async function flush(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    let items: Stored[] = []
    try { items = await idbAll() } catch { /* no idb */ }
    queued = items.length + memQueue.length; emit()
    for (const it of items) {
      try {
        await run(it.op)
      } catch (e) {
        if (isNetworkError(e)) return // still offline, try later
        onError((e as any)?.message || 'Queued save failed')
      }
      await idbDel(it.seq!)
      queued--; emit()
    }
    while (memQueue.length) {
      try { await run(memQueue[0]) } catch (e) { if (isNetworkError(e)) return }
      memQueue.shift()
      queued--; emit()
    }
  } finally {
    flushing = false
    if (again) { again = false; void flush() }
  }
}

let started = false
export function startQueue() {
  void flush()
  if (started) return
  started = true
  window.addEventListener('online', () => void flush())
  window.addEventListener('focus', () => void flush())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void flush())
  setInterval(() => queued > 0 && void flush(), 20000)
}

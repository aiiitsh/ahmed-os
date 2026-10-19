// App data store (Zustand). Local state is updated first (optimistic), then written through queue.ts.
import { create } from 'zustand'
import { supabase } from './supabase'
import { pendingCount, write, onPending, type Op } from './queue'
import { addDays, localDate } from './time'
import { EXERCISES, seedTarget } from '../data/program'
import { kgToLb } from './format'
import type {
  AppState, FocusBlock, HabitEntry, Log, QuranEvent, Target, WeeklyReview, Workout, WorkoutSet,
} from './types'

export interface Data {
  appState: AppState | null
  targets: Record<string, Target>
  quran: QuranEvent[]
  logs: Log[]
  focus: FocusBlock[]
  workouts: Workout[]
  sets: WorkoutSet[]
  habits: HabitEntry[]
  reviews: WeeklyReview[]
}

interface StoreState extends Data {
  userId: string | null
  email: string | null
  loaded: boolean
  loadError: string | null
  pending: number
  streakUnlocked: boolean
}

const empty: Data = {
  appState: null, targets: {}, quran: [], logs: [], focus: [], workouts: [], sets: [], habits: [], reviews: [],
}

export const useStore = create<StoreState>(() => ({
  ...empty, userId: null, email: null, loaded: false, loadError: null, pending: 0, streakUnlocked: false,
}))

onPending((n) => useStore.setState({ pending: n }))

export const get = () => useStore.getState()
export const set = useStore.setState
export const uid = () => get().userId!
export const newId = () => crypto.randomUUID()

// ---------- loading ----------

const HISTORY_DAYS = 120

async function q<T>(p: PromiseLike<{ data: any; error: any }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

export async function seedIfNeeded(userId: string) {
  const existing = await q<AppState[]>(supabase.from('app_state').select('user_id').eq('user_id', userId))
  if (existing.length) return
  await q(supabase.from('app_state').upsert({ user_id: userId, rotation_next: 'C', skills: {}, french_unit: 1, settings: { french_level: 'A1' } }))
  await q(supabase.from('exercise_targets').upsert(
    EXERCISES.map((e) => ({ user_id: userId, exercise_key: e.key, ...seedTarget(e), calibrated: false, times_done: 0 })),
  ))
}

/** Make sure every program exercise has a target row (e.g. after the program config grows). */
function fillTargets(userId: string, targets: Record<string, Target>) {
  const missing = EXERCISES.filter((e) => !targets[e.key])
  if (!missing.length) return targets
  const rows = missing.map((e) => ({ user_id: userId, exercise_key: e.key, ...seedTarget(e), last_feel: null, times_done: 0, calibrated: false }))
  void write({ kind: 'upsert', table: 'exercise_targets', values: rows })
  return { ...targets, ...Object.fromEntries(rows.map((r) => [r.exercise_key, r as Target])) }
}

let loading = false
export async function load(force = false) {
  const userId = get().userId
  if (!userId || loading) return
  // Don't overwrite optimistic local state with stale server data while writes are pending.
  if (!force && pendingCount() > 0) return
  loading = true
  try {
    const since = addDays(localDate(), -HISTORY_DAYS)
    const [app, targets, quran, logs, focus, workouts, sets, habits, reviews] = await Promise.all([
      q<AppState[]>(supabase.from('app_state').select('*')),
      q<Target[]>(supabase.from('exercise_targets').select('*')),
      // Full Quran history (small). Tolerate a missing table until migration 003 has been run.
      q<QuranEvent[]>(supabase.from('quran_events').select('*').order('at').range(0, 49999))
        .catch((e) => { console.warn('quran_events unavailable (run migration 003):', e?.message); return [] as QuranEvent[] }),
      q<Log[]>(supabase.from('logs').select('*').gte('local_date', since).order('logged_at').range(0, 9999)),
      q<FocusBlock[]>(supabase.from('focus_blocks').select('*').gte('local_date', since).order('started_at').range(0, 9999)),
      q<Workout[]>(supabase.from('workouts').select('*').gte('local_date', since).order('started_at').range(0, 9999)),
      q<WorkoutSet[]>(supabase.from('workout_sets').select('*').range(0, 19999)),
      q<HabitEntry[]>(supabase.from('habit_entries').select('*').order('entry_date').range(0, 9999)),
      q<WeeklyReview[]>(supabase.from('weekly_reviews').select('*').order('week_start')),
    ])
    if (pendingCount() > 0 && !force) return
    const wIds = new Set(workouts.map((w) => w.id))
    const num = (v: any) => (v == null ? null : Number(v))
    // Rows saved before migration 003 still carry kilograms.
    const lb = (row: any, lbKey: string, kgKey: string) => (row[lbKey] !== undefined ? num(row[lbKey]) : row[kgKey] != null ? kgToLb(Number(row[kgKey])) : null)
    const tMap = Object.fromEntries(targets.map((t) => [t.exercise_key, { ...t, weight_lb: lb(t, 'weight_lb', 'weight_kg') }]))
    set({
      appState: app[0] ?? null,
      targets: fillTargets(userId, tMap),
      quran, logs, focus, workouts,
      sets: sets.filter((s) => wIds.has(s.workout_id))
        .map((s) => ({ ...s, weight_lb: lb(s, 'weight_lb', 'weight_kg'), next_weight_lb: lb(s, 'next_weight_lb', 'next_weight_kg') })),
      habits, reviews, loaded: true, loadError: null,
    })
  } catch (e: any) {
    set({ loadError: e?.message || 'Could not load data', loaded: get().loaded })
  } finally {
    loading = false
  }
}

// ---------- local + remote helpers ----------

type ListKey = 'logs' | 'quran' | 'focus' | 'workouts' | 'sets' | 'habits' | 'reviews'
const TABLE: Record<ListKey, string> = {
  logs: 'logs', quran: 'quran_events', focus: 'focus_blocks', workouts: 'workouts', sets: 'workout_sets', habits: 'habit_entries', reviews: 'weekly_reviews',
}

/** Insert or replace rows in a local list (matched by id), then upsert remotely. */
export function putRows<K extends ListKey>(key: K, rows: Data[K][number][], onConflict?: string) {
  if (!rows.length) return
  const idOf = (r: any) => (key === 'reviews' ? r.week_start : r.id)
  set((s) => {
    const list = (s[key] as any[]).slice()
    for (const r of rows) {
      const i = list.findIndex((x) => idOf(x) === idOf(r))
      if (i >= 0) list[i] = r
      else list.push(r)
    }
    return { [key]: list } as any
  })
  void write({ kind: 'upsert', table: TABLE[key], values: rows as any, onConflict })
}

export function removeRow(key: ListKey, id: string) {
  set((s) => ({ [key]: (s[key] as any[]).filter((x) => x.id !== id) }) as any)
  if (key === 'workouts') set((s) => ({ sets: s.sets.filter((x) => x.workout_id !== id) }))
  void write({ kind: 'delete', table: TABLE[key], match: { id } })
}

export function patchApp(p: Partial<AppState>) {
  const cur = get().appState
  if (!cur) return
  const next = { ...cur, ...p, updated_at: new Date().toISOString() }
  set({ appState: next })
  void write({ kind: 'update', table: 'app_state', values: { ...p, updated_at: next.updated_at }, match: { user_id: cur.user_id } })
}

export function putTarget(t: Target) {
  set((s) => ({ targets: { ...s.targets, [t.exercise_key]: t } }))
  void write({ kind: 'upsert', table: 'exercise_targets', values: { ...t, updated_at: new Date().toISOString() } })
}


export const rawWrite = (op: Op) => write(op)

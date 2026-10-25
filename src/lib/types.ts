export type DayCode = 'A' | 'B' | 'C'
export type Feel = 'easy' | 'good' | 'hard'
export type Group = 'pull' | 'push' | 'arms' | 'shoulders' | 'core' | 'neck' | 'posterior'

export interface Skill {
  name: string
  level: number
  level_name: string
  pct: number
  active: boolean
}

/** What a focus block was about. Every part is optional. */
export interface FocusTag {
  /** category name, e.g. Study */
  cat?: string | null
  /** what you worked on, free text or a task title */
  what?: string | null
  /** linked to-do task */
  task?: string | null
}

export interface FocusState extends FocusTag {
  mode: 'focus' | 'break'
  kind: 'work' | 'study'
  started_at: string
}

export interface StepState {
  key: string
  swapped?: boolean
  weight?: number | null
  reps?: number
  feel?: Feel
  skipped?: boolean
  done?: boolean
  minutes?: number
  /** sets finished so far (set-by-set flow) */
  setsDone?: number
}

export interface ActiveSession {
  day: DayCode
  started_at: string
  step: number
  step_started_at: string
  steps: StepState[]
  finished?: boolean
  /** rest countdown in progress */
  rest_until?: string | null
  rest_total?: number
  rest_label?: string
  /** why some steps were left out (e.g. legs skipped after a big hike) */
  note?: string
}

export interface SwimPlan {
  /** rest between 25 m sprints */
  rest_s: number
  /** how long to keep going */
  target_min: number
}

export interface Settings {
  show_streak_in_review?: boolean
  french_level?: string
  swim?: SwimPlan
  /** Streak counts clean days from here when there are no earlier entries. */
  streak_start?: string
  /** Weekly plans by week start (Saturday). */
  week_plans?: Record<string, WeekPlan>
  /** To-do list. */
  tasks?: Task[]
  /** Focus categories (Afflo, Study, ...). */
  focus_categories?: string[]
  /** Labels for focus blocks, by block id. */
  focus_tags?: Record<string, FocusTag>
  /** one-off: blocks logged on 24 Oct 2026 were tagged Study */
  focus_backfill_1024?: boolean
  /** Long-term life plan (the "Life" screen). Lives here, not in the code, because the repo is public. */
  life_plan?: LifePlan
}

export interface LifeStep {
  id: string
  /** short name, e.g. "Next step" */
  tag: string
  /** what this step looks like, in Ahmed's own words */
  text: string
  /** deadline, money, Quran etc., in Ahmed's own words */
  details: string
  /** date this step should be reached (local date), optional */
  due: string | null
  /** optional line under the step, e.g. a role-model quote */
  note?: string
}

export interface LifePlan {
  reminder?: string
  principles?: string[]
  steps: LifeStep[]
  /** index of the step Ahmed is at now */
  current: number
  updated_at?: string
}

export interface Task {
  id: string
  title: string
  /** deadline (local date), optional */
  due?: string | null
  /** hidden from Today's plan until this day ("Move to tomorrow") */
  plan_on?: string | null
  done_at?: string | null
  created_at: string
}

export type SlotKind = 'gym' | 'swim' | 'run' | 'hike' | 'squash' | 'cardio' | 'rest'

/** One day of the weekly plan. */
export interface PlanSlot {
  kind: SlotKind
  /** training day for gym slots */
  day?: DayCode
}

export interface WeekPlan {
  week_start: string
  created_at: string
  days: PlanSlot[]
  why: string[]
}

export interface AppState {
  user_id: string
  rotation_next: DayCode
  skills: Record<string, Skill>
  french_unit: number
  pending_bed_at: string | null
  focus: FocusState | null
  active_session: ActiveSession | null
  streak_pin_hash: string | null
  settings: Settings
  updated_at?: string
}

export interface Target {
  user_id: string
  exercise_key: string
  weight_lb: number | null
  reps: number
  last_feel: Feel | null
  times_done: number
  calibrated: boolean
  updated_at?: string
}

export interface Workout {
  id: string
  user_id: string
  local_date: string
  day_code: DayCode
  started_at: string
  ended_at: string | null
  skill_key: string | null
  skill_done: boolean
  skill_minutes: number | null
  ended_early: boolean
}

export interface WorkoutSet {
  id: string
  workout_id: string
  user_id: string
  position: number
  exercise_key: string
  name_used: string
  sets: number | null
  reps: number | null
  weight_lb: number | null
  feel: Feel | null
  skipped: boolean
  next_weight_lb: number | null
  next_reps: number | null
}

/** One stretch of sleep: Sleep → Woke up. Naps and night wake-ups are just more segments. */
export interface SleepSeg {
  id: string
  user_id: string
  start_at: string | null
  end_at: string
  wake_reason: string | null
  created_at?: string
}

export interface FocusBlock {
  id: string
  user_id: string
  local_date: string
  block_type: 'focus' | 'break'
  kind: 'work' | 'study' | null
  started_at: string
  ended_at: string
  end_reason: 'break' | 'lost_focus' | 'stop' | 'resume' | null
}

export interface Juz {
  user_id: string
  juz: number
  memorized: boolean
  last_revised: string | null
  last_memorized: string | null
}

export type LogType = 'cardio' | 'stretch' | 'flag' | 'protein' | 'quran' | 'french' | 'bodyweight' | 'photo'

export interface Log {
  id: string
  user_id: string
  logged_at: string
  local_date: string
  type: LogType
  data: Record<string, any>
}

/** Quran: one row per event so the whole history is kept. */
export interface QuranEvent {
  id: string
  user_id: string
  surah: number
  kind: 'learned' | 'memorized' | 'revised'
  at: string
  local_date: string
  note: string | null
}

export interface HabitEntry {
  id: string
  user_id: string
  entry_date: string
  count: number
  porn?: boolean
  reason: string | null
  created_at?: string
  updated_at?: string
}

export interface WeeklyReview {
  user_id: string
  week_start: string
  summary: any
  claude_notes: string | null
  created_at?: string
}

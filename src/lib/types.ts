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

export interface FocusState {
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
}

export interface ActiveSession {
  day: DayCode
  started_at: string
  step: number
  step_started_at: string
  steps: StepState[]
  finished?: boolean
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

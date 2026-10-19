import type { DayCode, Group, Skill } from '../lib/types'

export type ExerciseKind = 'skill' | 'weighted' | 'bodyweight' | 'timed' | 'stretch'

export interface Exercise {
  key: string
  name: string
  short: string
  kind: ExerciseKind
  days: DayCode[]
  sets: number
  lo: number
  hi: number
  /** start weight (lb) for weighted, null otherwise */
  start: number | null
  /** lb step for weighted; rep/second increment otherwise */
  step: number
  swap?: string
  credit: Partial<Record<Group, number>>
  note: string
  icon: string
  /** hip thrust: maintain only */
  maintain?: boolean
  skill?: 'muscleup' | 'planche'
  /** stretch log 'which' value when done in a session */
  stretchWhich?: string
  /** weighted move measured in seconds (carries) */
  secs?: boolean
  /** rep/second increment for progression (default: step for timed, 1 otherwise) */
  repInc?: number
}

/** Reps are seconds for this move. */
export const isSecs = (e: Exercise) => e.kind === 'timed' || !!e.secs
/** How much one ± tap on reps changes. */
export const repStep = (e: Exercise) => e.repInc ?? (e.kind === 'timed' ? e.step : 1)

export const EXERCISES: Exercise[] = [
  { key: 'skill_muscleup', name: 'Muscle-up session (Thenx)', short: 'Muscle-up', kind: 'skill', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { pull: 4, push: 2, arms: 2, core: 1 }, note: "Open Thenx, do today's muscle-up session, tap Done.", icon: 'muscleup', skill: 'muscleup' },
  { key: 'db_curl', name: 'Dumbbell curl', short: 'Curl', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Cable curl',
    credit: { arms: 3 }, note: 'Elbows pinned, no swinging.', icon: 'curl' },
  { key: 'db_oh_triceps', name: 'Overhead dumbbell triceps extension', short: 'Overhead triceps ext.', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 25, step: 5, swap: 'Cable rope pushdown',
    credit: { arms: 3 }, note: 'Full stretch at the bottom.', icon: 'ohtriceps' },
  { key: 'db_lateral', name: 'Dumbbell lateral raise', short: 'Lateral raise', kind: 'weighted', days: ['A'], sets: 3, lo: 12, hi: 15, start: 12.5, step: 2.5, swap: 'Cable lateral raise',
    credit: { shoulders: 3 }, note: 'Lead with elbows, slight lean.', icon: 'lateral' },
  { key: 'hollow_hold', name: 'Hollow body hold', short: 'Hollow hold', kind: 'timed', days: ['A'], sets: 3, lo: 20, hi: 40, start: null, step: 5,
    credit: { core: 3 }, note: 'Lower back pressed into the floor, ribs down. The core move behind the muscle-up.', icon: 'hollow' },

  { key: 'skill_planche', name: 'Planche session (Thenx)', short: 'Planche', kind: 'skill', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { push: 4, shoulders: 2, core: 2, arms: 1 }, note: "Open Thenx, do today's planche session, tap Done.", icon: 'planche', skill: 'planche' },
  { key: 'db_hammer', name: 'Hammer curl', short: 'Hammer curl', kind: 'weighted', days: ['B'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Rope hammer curl',
    credit: { arms: 3 }, note: 'Neutral grip, slow down.', icon: 'hammer' },
  { key: 'db_reardelt', name: 'Dumbbell rear-delt fly', short: 'Rear-delt fly', kind: 'weighted', days: ['B'], sets: 3, lo: 12, hi: 15, start: 10, step: 2.5, swap: 'Cable face pull',
    credit: { shoulders: 3 }, note: 'Chest down, pull wide. Good for posture.', icon: 'reardelt' },
  { key: 'hanging_knee_raise', name: 'Hanging knee raise', short: 'Knee raise', kind: 'bodyweight', days: ['B'], sets: 3, lo: 8, hi: 15, start: null, step: 1, swap: "Captain's chair knee raise",
    credit: { core: 3 }, note: 'Curl the pelvis up. No swinging.', icon: 'kneeraise' },
  { key: 'side_plank', name: 'Side plank (each side)', short: 'Side plank', kind: 'timed', days: ['B'], sets: 3, lo: 30, hi: 60, start: null, step: 5,
    credit: { core: 3 }, note: 'Straight line, hips high.', icon: 'sideplank' },
  { key: 'neck_curl_ext', name: 'Neck curl + extension (light plate)', short: 'Neck curl + extension', kind: 'weighted', days: ['B'], sets: 2, lo: 15, hi: 20, start: 10, step: 2.5, swap: 'Neck harness',
    credit: { neck: 2 }, note: 'Very light, slow, no pain.', icon: 'neck' },

  { key: 'leg_curl', name: 'Lying/seated leg curl (machine)', short: 'Leg curl', kind: 'weighted', days: ['C'], sets: 3, lo: 10, hi: 12, start: 65, step: 10, swap: 'Seated leg curl',
    credit: { posterior: 3 }, note: 'Hamstrings pull the pelvis back into place.', icon: 'legcurl' },
  { key: 'hip_thrust_machine', name: 'Hip thrust machine', short: 'Hip thrust', kind: 'weighted', days: ['C'], sets: 2, lo: 10, hi: 10, start: 90, step: 10, swap: 'Glute bridge',
    credit: { posterior: 2 }, note: "Maintain only. Don't chase weight.", icon: 'hipthrust', maintain: true },
  { key: 'back_ext_45', name: '45° back extension, glute-focused', short: '45° back extension', kind: 'bodyweight', days: ['C'], sets: 2, lo: 12, hi: 15, start: null, step: 1,
    credit: { posterior: 2 }, note: "Round slightly, squeeze glutes, don't arch.", icon: 'backext' },
  { key: 'dead_bug', name: 'Dead bug', short: 'Dead bug', kind: 'bodyweight', days: ['C'], sets: 3, lo: 10, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Lower back glued to the floor. Slow, breathe out as you reach.', icon: 'deadbug' },
  { key: 'bird_dog', name: 'Bird dog (each side)', short: 'Bird dog', kind: 'bodyweight', days: ['C'], sets: 3, lo: 8, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Reach long, hips level, no twisting. Teaches you to sit and walk tall.', icon: 'birddog' },
  { key: 'suitcase_carry', name: 'Suitcase carry (one dumbbell, each side)', short: 'Suitcase carry', kind: 'weighted', secs: true, repInc: 5,
    days: ['C'], sets: 3, lo: 30, hi: 45, start: 35, step: 5,
    credit: { core: 3 }, note: "Walk tall, don't lean toward the weight. This is walking-posture training.", icon: 'carry' },
  { key: 'stretch_hip_flexor', name: 'Half-kneeling hip flexor stretch (each side)', short: 'Hip flexor stretch', kind: 'stretch', days: ['C'], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Squeeze the back glute. Key stretch for APT.', icon: 'hipflexor', stretchWhich: 'hip_flexors' },
  { key: 'stretch_chest', name: 'Doorway chest stretch', short: 'Chest stretch', kind: 'stretch', days: ['B', 'C'], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Your chest is tight. Breathe into it.', icon: 'cheststretch', stretchWhich: 'chest' },
]

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.key, e]))

export const DAYS: Record<DayCode, { name: string; sub: string; keys: string[] }> = {
  A: { name: 'Muscle-up + Arms', sub: 'Thenx skill · curls · triceps · laterals · core', keys: ['skill_muscleup', 'db_curl', 'db_oh_triceps', 'db_lateral', 'hollow_hold'] },
  B: { name: 'Planche + Core & Neck', sub: 'Thenx skill · hammer · rear delts · core · neck',
    keys: ['skill_planche', 'db_hammer', 'db_reardelt', 'hanging_knee_raise', 'side_plank', 'neck_curl_ext', 'stretch_chest'] },
  C: { name: 'Legs, Core & Posture', sub: 'About 35 min · hamstrings · core · carries',
    keys: ['leg_curl', 'hip_thrust_machine', 'back_ext_45', 'dead_bug', 'bird_dog', 'suitcase_carry', 'stretch_hip_flexor', 'stretch_chest'] },
}

export const nextDay = (d: DayCode): DayCode => (d === 'A' ? 'B' : d === 'B' ? 'C' : 'A')

export const GROUPS: { key: Group; label: string; lo: number; hi: number; note: string }[] = [
  { key: 'pull', label: 'Back / pull', lo: 8, hi: 14, note: 'mostly from muscle-up sessions' },
  { key: 'push', label: 'Chest / push', lo: 6, hi: 12, note: "from skills only, don't exceed (tight chest)" },
  { key: 'arms', label: 'Arms', lo: 12, hi: 20, note: 'priority' },
  { key: 'shoulders', label: 'Shoulders', lo: 8, hi: 14, note: 'rear delts help posture' },
  { key: 'core', label: 'Core', lo: 14, hi: 24, note: 'priority #1: sitting, walking and swimming tall' },
  { key: 'neck', label: 'Neck', lo: 2, hi: 6, note: 'balanced, light' },
  { key: 'posterior', label: 'Glutes + hams', lo: 5, hi: 9, note: 'maintain glutes, strengthen hamstrings' },
]
export const GROUP: Record<Group, (typeof GROUPS)[number]> = Object.fromEntries(GROUPS.map((g) => [g.key, g])) as any

export const SKILLS_SEED: Record<string, Skill> = {
  muscleup: { name: 'Muscle Up', level: 3, level_name: 'Jumping Muscle Up', pct: 44, active: true },
  planche: { name: 'Planche', level: 2, level_name: 'Frog Stand', pct: 17, active: true },
  frontlever: { name: 'Front Lever', level: 3, level_name: 'One Leg Front Lever', pct: 33, active: false },
  backlever: { name: 'Back Lever', level: 1, level_name: 'Skin the Cat', pct: 3, active: false },
  pistol: { name: 'Pistol Squat', level: 1, level_name: 'Deep Squat', pct: 0, active: false },
}

/** Starting target per exercise (seeded with calibrated=false). */
export function seedTarget(e: Exercise): { weight_lb: number | null; reps: number } {
  return { weight_lb: e.start, reps: e.kind === 'skill' ? 0 : e.lo }
}

// --- Daily core & posture routine (~6 min, every day) ---
export const DAILY_ROUTINE: { name: string; dose: string; icon: string }[] = [
  { name: 'Dead bug', dose: '1 × 10 slow', icon: 'deadbug' },
  { name: 'Bird dog', dose: '1 × 8 each side', icon: 'birddog' },
  { name: 'Glute bridge', dose: '1 × 15, squeeze 2 s', icon: 'hipthrust' },
  { name: 'Half-kneeling hip flexor stretch', dose: '45 s each side', icon: 'hipflexor' },
  { name: 'Doorway chest stretch', dose: '45 s', icon: 'cheststretch' },
  { name: 'Chin tucks against a wall', dose: '10 × 3 s hold', icon: 'neck' },
]

// --- Swim: 25 m sprint front, rest, 25 m sprint back, rest, repeat ---
export const SWIM_DEFAULT = { rest_s: 45, target_min: 20 }
export const SWIM_INTENSITY: [string, string][] = [['easy', 'Easy'], ['moderate', 'Moderate'], ['intense', 'Intense']]

// --- Cardio / stretch / French options ---
export const CARDIO = {
  swim: { label: 'Swim', icon: 'swim', def: 45, variants: [['sprints', 'Sprints'], ['endurance', 'Endurance'], ['technique', 'Technique']] },
  run: { label: 'Run', icon: 'run', def: 30, variants: [['easy', 'Easy'], ['intervals', 'Intervals'], ['long', 'Long']] },
  squash: { label: 'Squash', icon: 'squash', def: 60, variants: [['match', 'Match'], ['drills', 'Drills']] },
  hike: { label: 'Hike', icon: 'hike', def: 180, variants: [] },
} as const
export type Sport = keyof typeof CARDIO
export const DURATIONS = [20, 30, 45, 60, 90]

export const STRETCHES: [string, string][] = [
  ['hip_flexors', 'Hip flexors'],
  ['chest', 'Chest (doorway)'],
  ['adductors', 'Adductors'],
  ['hamstrings', 'Hamstrings'],
  ['thenx_routine', 'Thenx routine'],
  ['daily_routine', 'Daily core & posture routine'],
]
export const STRETCH_LABEL = Object.fromEntries(STRETCHES)

export const FRENCH_ACTIVITIES: [string, string][] = [
  ['book', 'Book'], ['vocab', 'Vocab'], ['listening', 'Listening'], ['speaking', 'Speaking'], ['writing', 'Writing'],
]
export const FRENCH_MINUTES = [15, 30, 45, 60]

// Weekly goals (Home ring + Review). Quran and French have no targets: doing them is a plus, skipping isn't a minus.
export const GOALS = { sessions: 4, focusHours: 15, routineDays: 5 }

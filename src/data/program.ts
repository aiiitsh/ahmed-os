import type { DayCode, Group, Skill } from '../lib/types'

export type ExerciseKind = 'skill' | 'weighted' | 'bodyweight' | 'timed' | 'stretch' | 'prep'

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
  /** no longer in the program (kept so old history still reads) */
  retired?: boolean
  skill?: 'muscleup' | 'planche'
  /** stretch log 'which' value when done in a session */
  stretchWhich?: string
  /** weighted move measured in seconds (carries) */
  secs?: boolean
  /** rep/second increment for progression (default: step for timed, 1 otherwise) */
  repInc?: number
  /** base rest between sets, seconds (adjusted by how the last session felt) */
  rest?: number
  /** a leg exercise: skipped on Day C when a big hike already covered legs this week */
  legs?: boolean
  /** warm-up / cool-down: the moves to do, in order */
  moves?: { name: string; dose: string }[]
}

/** Reps are seconds for this move. */
export const isSecs = (e: Exercise) => e.kind === 'timed' || !!e.secs
/** How much one ± tap on reps changes. */
export const repStep = (e: Exercise) => e.repInc ?? (e.kind === 'timed' ? e.step : 1)

export const EXERCISES: Exercise[] = [
  { key: 'skill_muscleup', name: 'Muscle-up session (Thenx)', short: 'Muscle-up', kind: 'skill', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { pull: 4, push: 2, arms: 2, core: 1 }, note: "Open Thenx, do today's muscle-up session, tap Done.", icon: 'muscleup', skill: 'muscleup' },
  { key: 'db_curl', name: 'Dumbbell curl', short: 'Curl', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Cable curl',
    credit: { arms: 3 }, note: 'Elbows pinned, no swinging.', icon: 'curl', rest: 75 },
  { key: 'db_oh_triceps', name: 'Overhead dumbbell triceps extension', short: 'Overhead triceps ext.', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 25, step: 5, swap: 'Cable rope pushdown',
    credit: { arms: 3 }, note: 'Full stretch at the bottom.', icon: 'ohtriceps', rest: 75 },
  { key: 'db_lateral', name: 'Dumbbell lateral raise', short: 'Lateral raise', kind: 'weighted', days: ['A'], sets: 3, lo: 12, hi: 15, start: 12.5, step: 2.5, swap: 'Cable lateral raise',
    credit: { shoulders: 3 }, note: 'Lead with elbows, slight lean.', icon: 'lateral', rest: 60 },
  { key: 'hollow_hold', name: 'Hollow body hold', short: 'Hollow hold', kind: 'timed', days: ['A'], sets: 3, lo: 20, hi: 40, start: null, step: 5,
    credit: { core: 3 }, note: 'Lower back pressed into the floor, ribs down. The core move behind the muscle-up.', icon: 'hollow', rest: 45 },

  { key: 'skill_planche', name: 'Planche session (Thenx)', short: 'Planche', kind: 'skill', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { push: 4, shoulders: 2, core: 2, arms: 1 }, note: "Open Thenx, do today's planche session, tap Done.", icon: 'planche', skill: 'planche' },
  { key: 'db_hammer', name: 'Hammer curl', short: 'Hammer curl', kind: 'weighted', days: ['B'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Rope hammer curl',
    credit: { arms: 3 }, note: 'Neutral grip, slow down.', icon: 'hammer', rest: 75 },
  { key: 'db_reardelt', name: 'Dumbbell rear-delt fly', short: 'Rear-delt fly', kind: 'weighted', days: ['B'], sets: 3, lo: 12, hi: 15, start: 10, step: 2.5, swap: 'Cable face pull',
    credit: { shoulders: 3 }, note: 'Chest down, pull wide. Good for posture.', icon: 'reardelt', rest: 60 },
  { key: 'hanging_knee_raise', name: 'Hanging knee raise', short: 'Knee raise', kind: 'bodyweight', days: ['B'], sets: 3, lo: 8, hi: 15, start: null, step: 1, swap: "Captain's chair knee raise",
    credit: { core: 3 }, note: 'Curl the pelvis up. No swinging.', icon: 'kneeraise', rest: 60 },
  { key: 'side_plank', name: 'Side plank (each side)', short: 'Side plank', kind: 'timed', days: ['B'], sets: 3, lo: 30, hi: 60, start: null, step: 5,
    credit: { core: 3 }, note: 'Straight line, hips high.', icon: 'sideplank', rest: 45 },
  { key: 'neck_curl_ext', name: 'Neck curl + extension (light plate)', short: 'Neck curl + extension', kind: 'weighted', days: ['B'], sets: 2, lo: 15, hi: 20, start: 10, step: 2.5, swap: 'Neck harness',
    credit: { neck: 2 }, note: 'Very light, slow, no pain.', icon: 'neck', rest: 60 },

  { key: 'leg_curl', name: 'Lying/seated leg curl (machine)', short: 'Leg curl', kind: 'weighted', days: ['C'], sets: 3, lo: 10, hi: 12, start: 65, step: 10, swap: 'Seated leg curl',
    credit: { posterior: 3 }, note: 'Hamstrings pull the back of the pelvis down: the main muscle for fixing APT. Grows hamstrings, not glutes.', icon: 'legcurl', rest: 90, legs: true },
  { key: 'hip_thrust_machine', name: 'Hip thrust machine', short: 'Hip thrust', kind: 'weighted', days: [], sets: 2, lo: 10, hi: 10, start: 90, step: 10, swap: 'Glute bridge',
    credit: { posterior: 2 }, note: 'Removed: glutes are big enough. No glute loading.', icon: 'hipthrust', maintain: true, rest: 90, legs: true, retired: true },
  { key: 'back_ext_45', name: '45° back extension, no weight (posture endurance)', short: '45° back extension', kind: 'bodyweight', days: ['C'], sets: 2, lo: 12, hi: 20, start: null, step: 1,
    credit: { posterior: 1 }, note: 'No plate: this is endurance, not size. Tuck the pelvis, round slightly, stop at a straight line. Never arch.', icon: 'backext', rest: 60, legs: true },
  { key: 'reverse_crunch', name: 'Reverse crunch', short: 'Reverse crunch', kind: 'bodyweight', days: ['C'], sets: 3, lo: 10, hi: 15, start: null, step: 1, swap: 'Hanging knee raise',
    credit: { core: 3 }, note: 'Lift the hips off the floor with your lower abs, slowly. This is the exact move that tucks your pelvis.', icon: 'kneeraise', rest: 45 },
  { key: 'dead_bug', name: 'Dead bug', short: 'Dead bug', kind: 'bodyweight', days: ['C'], sets: 3, lo: 10, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Lower back glued to the floor. Slow, breathe out as you reach.', icon: 'deadbug', rest: 45 },
  { key: 'bird_dog', name: 'Bird dog (each side)', short: 'Bird dog', kind: 'bodyweight', days: ['C'], sets: 3, lo: 8, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Reach long, hips level, no twisting. Teaches you to sit and walk tall.', icon: 'birddog', rest: 45 },
  { key: 'suitcase_carry', name: 'Suitcase carry (one dumbbell, each side)', short: 'Suitcase carry', kind: 'weighted', secs: true, repInc: 5,
    days: ['C'], sets: 3, lo: 30, hi: 45, start: 35, step: 5,
    credit: { core: 3 }, note: "Walk tall, don't lean toward the weight. This is walking-posture training.", icon: 'carry', rest: 60 },
  { key: 'stretch_hip_flexor', name: 'Half-kneeling hip flexor stretch (each side)', short: 'Hip flexor stretch', kind: 'stretch', days: ['C'], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Squeeze the back glute. Key stretch for APT.', icon: 'hipflexor', stretchWhich: 'hip_flexors' },
  { key: 'stretch_chest', name: 'Doorway chest stretch', short: 'Chest stretch', kind: 'stretch', days: ['B', 'C'], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Your chest is tight. Breathe into it.', icon: 'cheststretch', stretchWhich: 'chest' },

  // ---- warm-ups (dynamic) and cool-downs (static), matched to each day ----
  { key: 'warmup_A', name: 'Warm-up: shoulders, lats & wrists', short: 'Warm-up', kind: 'prep', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Dynamic, about 6 minutes. Easy pace, get warm, no stretching holds yet.', icon: 'stretch',
    moves: [
      { name: 'Jumping jacks or skipping', dose: '60 s' }, { name: 'Arm circles, forward + back', dose: '15 each' },
      { name: 'Band pull-aparts (or arm swings)', dose: '15' }, { name: 'Scapula pull-ups on the bar', dose: '2 × 8' },
      { name: 'Wrist circles + palm rocks', dose: '30 s' }, { name: 'Dead hang', dose: '2 × 20 s' },
    ] },
  { key: 'cooldown_A', name: 'Cool-down: lats, biceps, triceps', short: 'Cool-down', kind: 'prep', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Static holds, slow breathing.', icon: 'stretch',
    moves: [
      { name: 'Lat stretch (hold a post, sit back)', dose: '30 s each side' }, { name: 'Biceps wall stretch', dose: '30 s each side' },
      { name: 'Overhead triceps stretch', dose: '30 s each side' }, { name: "Child's pose", dose: '45 s' },
    ] },
  { key: 'warmup_B', name: 'Warm-up: wrists, shoulders, core', short: 'Warm-up', kind: 'prep', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Dynamic, about 6 minutes. Planche loads the wrists: do not skip them.', icon: 'stretch',
    moves: [
      { name: 'Jumping jacks or skipping', dose: '60 s' }, { name: 'Wrist circles, palm rocks, finger-back rocks', dose: '60 s' },
      { name: 'Arm circles', dose: '15 each way' }, { name: 'Scapula push-ups', dose: '2 × 10' },
      { name: 'Cat-cow', dose: '8' }, { name: 'Slow neck rolls', dose: '5 each way' },
    ] },
  { key: 'cooldown_B', name: 'Cool-down: chest, wrists, neck', short: 'Cool-down', kind: 'prep', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Your chest is tight: breathe into the doorway stretch.', icon: 'cheststretch', stretchWhich: 'chest',
    moves: [
      { name: 'Doorway chest stretch', dose: '2 × 45 s' }, { name: 'Wrist flexor + extensor stretch', dose: '30 s each' },
      { name: 'Neck side stretch', dose: '30 s each side' }, { name: 'Cobra into child’s pose', dose: '45 s' },
    ] },
  { key: 'warmup_C', name: 'Warm-up: hips, hamstrings, glutes', short: 'Warm-up', kind: 'prep', days: ['C'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Dynamic, about 6 minutes. Bodyweight only: wake the glutes up (activation, not growth).', icon: 'stretch',
    moves: [
      { name: 'Brisk walk or bike', dose: '2 min' }, { name: 'Leg swings, front-back + side', dose: '10 each leg' },
      { name: 'Hip circles', dose: '10 each way' }, { name: 'Glute bridge, tuck pelvis first, no weight', dose: '12' },
      { name: 'Walking lunge with overhead reach', dose: '6 each leg' }, { name: 'Cat-cow', dose: '8' },
    ] },
  { key: 'cooldown_C', name: 'Cool-down: hip flexors, hamstrings, chest', short: 'Cool-down', kind: 'prep', days: ['C'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'The hip flexor stretch is the key one for your pelvic tilt.', icon: 'hipflexor', stretchWhich: 'hip_flexors',
    moves: [
      { name: 'Half-kneeling hip flexor stretch (squeeze back glute)', dose: '45 s each side' }, { name: 'Hamstring stretch', dose: '45 s each side' },
      { name: 'Figure-4 glute stretch', dose: '30 s each side' }, { name: 'Doorway chest stretch', dose: '45 s' },
    ] },
]

/** Rest between exercises (after the skill session it's longer). */
export const TRANSITION_REST = 90
export const AFTER_SKILL_REST = 120

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.key, e]))

export const DAYS: Record<DayCode, { name: string; sub: string; keys: string[] }> = {
  A: { name: 'Muscle-up + Arms', sub: 'Warm-up · Thenx skill · curls · triceps · laterals · core · cool-down',
    keys: ['warmup_A', 'skill_muscleup', 'db_curl', 'db_oh_triceps', 'db_lateral', 'hollow_hold', 'cooldown_A'] },
  B: { name: 'Planche + Core & Neck', sub: 'Warm-up · Thenx skill · hammer · rear delts · core · neck · cool-down',
    keys: ['warmup_B', 'skill_planche', 'db_hammer', 'db_reardelt', 'hanging_knee_raise', 'side_plank', 'neck_curl_ext', 'cooldown_B'] },
  C: { name: 'Hamstrings, Core & Posture', sub: 'About 40 min · warm-up · hamstrings · lower abs · core · carries · cool-down. No glute loading.',
    keys: ['warmup_C', 'leg_curl', 'back_ext_45', 'reverse_crunch', 'dead_bug', 'bird_dog', 'suitcase_carry', 'cooldown_C'] },
}

export const nextDay = (d: DayCode): DayCode => (d === 'A' ? 'B' : d === 'B' ? 'C' : 'A')

export const GROUPS: { key: Group; label: string; lo: number; hi: number; note: string }[] = [
  { key: 'pull', label: 'Back / pull', lo: 8, hi: 14, note: 'mostly from muscle-up sessions' },
  { key: 'push', label: 'Chest / push', lo: 6, hi: 12, note: "from skills only, don't exceed (tight chest)" },
  { key: 'arms', label: 'Arms', lo: 12, hi: 20, note: 'priority' },
  { key: 'shoulders', label: 'Shoulders', lo: 8, hi: 14, note: 'rear delts help posture' },
  { key: 'core', label: 'Core', lo: 14, hi: 24, note: 'priority #1: sitting, walking and swimming tall' },
  { key: 'neck', label: 'Neck', lo: 2, hi: 6, note: 'balanced, light' },
  { key: 'posterior', label: 'Hams + glutes', lo: 3, hi: 9, note: 'hamstrings only; glutes are activated, never loaded' },
]
export const GROUP: Record<Group, (typeof GROUPS)[number]> = Object.fromEntries(GROUPS.map((g) => [g.key, g])) as any

export const SKILLS_SEED: Record<string, Skill> = {
  muscleup: { name: 'Muscle Up', level: 3, level_name: 'Jumping Muscle Up', pct: 44, active: true },
  planche: { name: 'Planche', level: 2, level_name: 'Frog Stand', pct: 17, active: true },
  frontlever: { name: 'Front Lever', level: 3, level_name: 'One Leg Front Lever', pct: 33, active: false },
  backlever: { name: 'Back Lever', level: 1, level_name: 'Skin the Cat', pct: 3, active: false },
  pistol: { name: 'Pistol Squat', level: 1, level_name: 'Deep Squat', pct: 0, active: false },
}

/** Exercises that keep a weight/reps target. */
export const TRACKED = () => EXERCISES.filter((e) => e.kind !== 'prep' && !e.retired)

/** Starting target per exercise (seeded with calibrated=false). */
export function seedTarget(e: Exercise): { weight_lb: number | null; reps: number } {
  return { weight_lb: e.start, reps: e.kind === 'skill' ? 0 : e.lo }
}

// --- Daily core & posture routine (~6 min, every day) ---
/**
 * Gentle posture reset (~8 min) for non-gym days: more activation than stretching.
 * Stretches stay at about 4/10 effort; deep holds were leaving you sore.
 * On gym days the warm-up and cool-down already cover this.
 */
export const DAILY_ROUTINE: { name: string; dose: string; icon: string }[] = [
  { name: 'Dead bug (lower back stays down)', dose: '1 × 8 slow', icon: 'deadbug' },
  { name: 'Glute bridge, no weight: tuck pelvis, then squeeze 2 s', dose: '1 × 12', icon: 'hipthrust' },
  { name: 'Bird dog', dose: '1 × 6 each side', icon: 'birddog' },
  { name: 'Wall angels (back flat on wall)', dose: '1 × 8', icon: 'cheststretch' },
  { name: 'Half-kneeling hip flexor stretch, gentle (4/10)', dose: '30 s each side', icon: 'hipflexor' },
  { name: 'Chin tucks against a wall', dose: '8 × 3 s', icon: 'neck' },
  { name: 'Standing pelvic tuck: tuck, hold 5 s, relax to neutral', dose: '1 × 8', icon: 'hollow' },
]
export const ROUTINE_TIP = 'Gentle: stretches at 4/10, never painful. Sore afterwards means too deep or too long, so ease off.'

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

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
  // ---- Day A: pull + arms (Monday) ----
  { key: 'skill_muscleup', name: 'Muscle-up session (Thenx)', short: 'Muscle-up', kind: 'skill', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { pull: 4, push: 2, arms: 2, core: 1 }, note: "Open Thenx, do today's muscle-up session, tap Done.", icon: 'muscleup', skill: 'muscleup' },
  { key: 'db_row', name: 'One-arm dumbbell row (each side)', short: 'One-arm row', kind: 'weighted', days: ['A'], sets: 3, lo: 8, hi: 12, start: 35, step: 5, swap: 'Inverted row',
    credit: { pull: 3 }, note: 'Pull the elbow to your hip, shoulder down away from the ear. Back thickness + shoulders back.', icon: 'reardelt', rest: 90 },
  { key: 'incline_curl', name: 'Incline dumbbell curl', short: 'Incline curl', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 15, step: 5, swap: 'Dumbbell curl',
    credit: { arms: 3 }, note: 'Bench at 45°, arms hang straight down. Full stretch at the bottom, no swinging.', icon: 'curl', rest: 75 },
  { key: 'db_oh_triceps', name: 'Overhead dumbbell triceps extension', short: 'Overhead triceps ext.', kind: 'weighted', days: ['A'], sets: 3, lo: 10, hi: 12, start: 25, step: 5, swap: 'Cable rope pushdown',
    credit: { arms: 3 }, note: 'Full stretch at the bottom. Triceps are 2/3 of your arm.', icon: 'ohtriceps', rest: 75 },
  { key: 'face_pull', name: 'Face pull (cable or band)', short: 'Face pull', kind: 'weighted', days: ['A'], sets: 3, lo: 12, hi: 15, start: 25, step: 5, swap: 'Prone Y-raise',
    credit: { shoulders: 3 }, note: 'Pull to your forehead, thumbs back, shoulders DOWN. Un-shrugs tight traps.', icon: 'reardelt', rest: 60 },
  { key: 'hollow_hold', name: 'Hollow body hold', short: 'Hollow hold', kind: 'timed', days: ['A'], sets: 3, lo: 20, hi: 40, start: null, step: 5,
    credit: { core: 3 }, note: 'Lower back pressed into the floor, ribs down. The core move behind the muscle-up.', icon: 'hollow', rest: 45 },

  // ---- Day B: push + arms (Thursday) ----
  { key: 'skill_planche', name: 'Planche session (Thenx)', short: 'Planche', kind: 'skill', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0,
    credit: { push: 4, shoulders: 2, core: 2, arms: 1 }, note: "Open Thenx, do today's planche session, tap Done.", icon: 'planche', skill: 'planche' },
  { key: 'dips', name: 'Dips, slight forward lean', short: 'Dips', kind: 'bodyweight', days: ['B'], sets: 3, lo: 6, hi: 12, start: null, step: 1, swap: 'Deficit push-ups',
    credit: { push: 3, arms: 1 }, note: 'Lean forward a little, go down until a stretch in the chest, shoulders away from the ears. Chest size through a full stretch.', icon: 'dumbbell', rest: 90 },
  { key: 'db_hammer', name: 'Hammer curl', short: 'Hammer curl', kind: 'weighted', days: ['B'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Rope hammer curl',
    credit: { arms: 3 }, note: 'Neutral grip, slow down.', icon: 'hammer', rest: 75 },
  { key: 'db_lateral', name: 'Dumbbell lateral raise', short: 'Lateral raise', kind: 'weighted', days: ['B'], sets: 3, lo: 12, hi: 15, start: 12.5, step: 2.5, swap: 'Cable lateral raise',
    credit: { shoulders: 3 }, note: 'Lead with elbows, slight lean. Do not shrug.', icon: 'lateral', rest: 60 },
  { key: 'neck_curl_ext', name: 'Neck curl + extension (light plate)', short: 'Neck curl + extension', kind: 'weighted', days: ['B', 'D'], sets: 2, lo: 15, hi: 20, start: 10, step: 2.5, swap: 'Neck harness',
    credit: { neck: 2 }, note: 'Very light, slow, no pain. Skip it today if the neck hurts more than usual.', icon: 'neck', rest: 60 },
  { key: 'hanging_knee_raise', name: 'Hanging knee raise', short: 'Knee raise', kind: 'bodyweight', days: ['B'], sets: 3, lo: 8, hi: 15, start: null, step: 1, swap: "Captain's chair knee raise",
    credit: { core: 3 }, note: 'Curl the pelvis up. No swinging.', icon: 'kneeraise', rest: 60 },

  // ---- Day C: legs, core + knees (Tuesday) ----
  { key: 'leg_ext', name: 'Leg extension (machine)', short: 'Leg extension', kind: 'weighted', days: ['C'], sets: 3, lo: 10, hi: 15, start: 50, step: 10,
    credit: { posterior: 3 }, note: 'Quads with almost no glute. Slow, pause at the top, knees in line with your toes.', icon: 'legcurl', rest: 90, legs: true },
  { key: 'step_down', name: 'Slow step-down from a low box (each leg)', short: 'Step-down', kind: 'bodyweight', days: ['C'], sets: 3, lo: 8, hi: 12, start: null, step: 1,
    credit: { posterior: 2 }, note: '3 s down, front heel just touches. Knee stays over your 2nd toe the whole way: watch it in a mirror.', icon: 'stretch', rest: 60, legs: true },
  { key: 'leg_curl', name: 'Lying/seated leg curl (machine)', short: 'Leg curl', kind: 'weighted', days: ['C'], sets: 3, lo: 10, hi: 12, start: 65, step: 10, swap: 'Seated leg curl',
    credit: { posterior: 3 }, note: 'Hamstrings pull the back of the pelvis down: the main muscle for fixing APT. Grows hamstrings, not glutes.', icon: 'legcurl', rest: 90, legs: true },
  { key: 'copenhagen', name: 'Copenhagen plank, short lever (each side)', short: 'Copenhagen plank', kind: 'timed', days: ['C'], sets: 2, lo: 15, hi: 30, start: null, step: 5,
    credit: { core: 2, posterior: 1 }, note: 'Top knee on the bench, body straight. Inner thighs hold your knees in line, no glute growth.', icon: 'sideplank', rest: 45 },
  { key: 'reverse_crunch', name: 'Reverse crunch', short: 'Reverse crunch', kind: 'bodyweight', days: ['C'], sets: 3, lo: 10, hi: 15, start: null, step: 1, swap: 'Hanging knee raise',
    credit: { core: 3 }, note: 'Lift the hips off the floor with your lower abs, slowly. This is the exact move that tucks your pelvis.', icon: 'kneeraise', rest: 45 },
  { key: 'suitcase_carry', name: 'Suitcase carry (one dumbbell, each side)', short: 'Suitcase carry', kind: 'weighted', secs: true, repInc: 5,
    days: ['C'], sets: 2, lo: 30, hi: 40, start: 35, step: 5,
    credit: { core: 3 }, note: "Walk tall, don't lean toward the weight. This is walking-posture training.", icon: 'carry', rest: 60 },

  // ---- Day D: size day, no skill (Saturday) ----
  { key: 'incline_db_press', name: 'Incline dumbbell press', short: 'Incline press', kind: 'weighted', days: ['D'], sets: 3, lo: 8, hi: 12, start: 30, step: 5, swap: 'Deficit push-ups',
    credit: { push: 3, arms: 1 }, note: 'Bench at 30°. Shoulder blades back and down, deep stretch at the bottom. Upper chest.', icon: 'dumbbell', rest: 90 },
  { key: 'pullup', name: 'Pull-ups (or lat pulldown)', short: 'Pull-ups', kind: 'bodyweight', days: ['D'], sets: 3, lo: 6, hi: 12, start: null, step: 1, swap: 'Lat pulldown',
    credit: { pull: 3, arms: 1 }, note: 'Full hang at the bottom, chest to the bar. Back width.', icon: 'muscleup', rest: 90 },
  { key: 'cs_row', name: 'Chest-supported dumbbell row', short: 'Chest-supported row', kind: 'weighted', days: ['D'], sets: 3, lo: 10, hi: 12, start: 25, step: 5, swap: 'Seated cable row',
    credit: { pull: 3 }, note: 'Chest on an incline bench, squeeze the shoulder blades together. Mid-back, posture.', icon: 'reardelt', rest: 75 },
  { key: 'db_curl', name: 'Dumbbell curl', short: 'Curl', kind: 'weighted', days: ['D'], sets: 3, lo: 10, hi: 12, start: 20, step: 5, swap: 'Cable curl',
    credit: { arms: 3 }, note: 'Elbows pinned, no swinging.', icon: 'curl', rest: 60 },
  { key: 'triceps_pushdown', name: 'Triceps pushdown (cable)', short: 'Triceps pushdown', kind: 'weighted', days: ['D'], sets: 3, lo: 10, hi: 12, start: 40, step: 5, swap: 'Close-grip push-ups',
    credit: { arms: 3 }, note: 'Elbows pinned to your sides, full lockout.', icon: 'ohtriceps', rest: 60 },
  { key: 'db_reardelt', name: 'Dumbbell rear-delt fly', short: 'Rear-delt fly', kind: 'weighted', days: ['D'], sets: 2, lo: 12, hi: 15, start: 10, step: 2.5, swap: 'Cable face pull',
    credit: { shoulders: 2 }, note: 'Chest down, pull wide. Good for posture.', icon: 'reardelt', rest: 60 },
  { key: 'dead_bug', name: 'Dead bug (each side)', short: 'Dead bug', kind: 'bodyweight', days: ['D'], sets: 3, lo: 8, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Lower back glued to the floor. Slow, breathe out as you reach.', icon: 'deadbug', rest: 45 },

  // ---- no longer in the program (kept so old history still reads) ----
  { key: 'side_plank', name: 'Side plank (each side)', short: 'Side plank', kind: 'timed', days: [], sets: 3, lo: 30, hi: 60, start: null, step: 5,
    credit: { core: 3 }, note: 'Straight line, hips high.', icon: 'sideplank', rest: 45, retired: true },
  { key: 'hip_thrust_machine', name: 'Hip thrust machine', short: 'Hip thrust', kind: 'weighted', days: [], sets: 2, lo: 10, hi: 10, start: 90, step: 10, swap: 'Glute bridge',
    credit: { posterior: 2 }, note: 'Removed: glutes are big enough. No glute loading.', icon: 'hipthrust', maintain: true, rest: 90, legs: true, retired: true },
  { key: 'back_ext_45', name: '45° back extension, no weight (posture endurance)', short: '45° back extension', kind: 'bodyweight', days: [], sets: 2, lo: 12, hi: 20, start: null, step: 1,
    credit: { posterior: 1 }, note: 'Tuck the pelvis, round slightly, stop at a straight line. Never arch.', icon: 'backext', rest: 60, legs: true, retired: true },
  { key: 'bird_dog', name: 'Bird dog (each side)', short: 'Bird dog', kind: 'bodyweight', days: [], sets: 3, lo: 8, hi: 12, start: null, step: 1,
    credit: { core: 3 }, note: 'Reach long, hips level, no twisting.', icon: 'birddog', rest: 45, retired: true },
  { key: 'stretch_hip_flexor', name: 'Half-kneeling hip flexor stretch (each side)', short: 'Hip flexor stretch', kind: 'stretch', days: [], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Squeeze the back glute. Key stretch for APT.', icon: 'hipflexor', stretchWhich: 'hip_flexors', retired: true },
  { key: 'stretch_chest', name: 'Doorway chest stretch', short: 'Chest stretch', kind: 'stretch', days: [], sets: 2, lo: 45, hi: 45, start: null, step: 0,
    credit: {}, note: 'Your chest is tight. Breathe into it.', icon: 'cheststretch', stretchWhich: 'chest', retired: true },

  // ---- warm-ups (dynamic) and cool-downs (static): your daily stretches live here ----
  { key: 'warmup_A', name: 'Warm-up: breathing, shoulders, lats', short: 'Warm-up', kind: 'prep', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'About 6 minutes. The breathing drill retrains you to breathe with your belly, not your traps.', icon: 'stretch',
    moves: [
      { name: '90/90 breathing: on your back, feet on a wall, belly + sides, long exhale', dose: '5 breaths' }, { name: 'Cat-cow', dose: '8' },
      { name: 'Band pull-aparts', dose: '15' }, { name: 'Scapula pull-ups on the bar', dose: '2 × 8' }, { name: 'Dead hang', dose: '2 × 20 s' },
    ] },
  { key: 'cooldown_A', name: 'Cool-down: lats, chest, traps, neck', short: 'Cool-down', kind: 'prep', days: ['A'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Static holds, slow breathing.', icon: 'cheststretch', stretchWhich: 'chest',
    moves: [
      { name: 'Lat stretch (hold a post, sit back)', dose: '30 s each side' }, { name: 'Doorway chest stretch', dose: '45 s' },
      { name: 'Upper trap stretch (ear to shoulder, other hand down)', dose: '30 s each side' }, { name: 'Chin tucks against a wall', dose: '8 × 3 s' },
    ] },
  { key: 'warmup_B', name: 'Warm-up: wrists, shoulders, neck', short: 'Warm-up', kind: 'prep', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'About 6 minutes. Planche loads the wrists: do not skip them.', icon: 'stretch',
    moves: [
      { name: '90/90 breathing', dose: '5 breaths' }, { name: 'Wrist circles, palm rocks, finger-back rocks', dose: '60 s' },
      { name: 'Scapula push-ups', dose: '2 × 10' }, { name: 'Wall angels (back flat on the wall)', dose: '8' }, { name: 'Chin tucks', dose: '8 × 3 s' },
    ] },
  { key: 'cooldown_B', name: 'Cool-down: chest, wrists, neck', short: 'Cool-down', kind: 'prep', days: ['B'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Your chest is tight: breathe into the doorway stretch.', icon: 'cheststretch', stretchWhich: 'chest',
    moves: [
      { name: 'Doorway chest stretch', dose: '2 × 45 s' }, { name: 'Wrist flexor + extensor stretch', dose: '30 s each' },
      { name: 'Neck side stretch', dose: '30 s each side' }, { name: "Child's pose", dose: '45 s' },
    ] },
  { key: 'warmup_C', name: 'Warm-up: feet, knees, hips', short: 'Warm-up', kind: 'prep', days: ['C'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'About 6 minutes. This is your knee and foot program: do it every Day C.', icon: 'stretch',
    moves: [
      { name: 'Bike', dose: '2 min' },
      { name: 'Short-foot drill: lift the arch, toes stay flat (extra set on the left)', dose: '5 × 5 s each foot' },
      { name: 'Tibialis raises, back on a wall', dose: '15' },
      { name: 'Single-leg balance, barefoot, tripod foot', dose: '30 s each leg' },
      { name: 'Glute bridge, no weight: tuck pelvis, squeeze 2 s', dose: '12' },
    ] },
  { key: 'cooldown_C', name: 'Cool-down: hip flexors, quads, hamstrings', short: 'Cool-down', kind: 'prep', days: ['C'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'The hip flexor and couch stretches are the key ones for your pelvic tilt and tight quads.', icon: 'hipflexor', stretchWhich: 'hip_flexors',
    moves: [
      { name: 'Half-kneeling hip flexor stretch (squeeze back glute, tuck)', dose: '45 s each side' },
      { name: 'Couch stretch (back knee down, foot up on a bench)', dose: '30 s each side' },
      { name: 'Hamstring stretch', dose: '30 s each side' },
    ] },
  { key: 'warmup_D', name: 'Warm-up: breathing, shoulders, chest', short: 'Warm-up', kind: 'prep', days: ['D'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'About 6 minutes.', icon: 'stretch',
    moves: [
      { name: '90/90 breathing', dose: '5 breaths' }, { name: 'Band pull-aparts', dose: '15' }, { name: 'Wall angels', dose: '8' },
      { name: 'Easy push-ups', dose: '10' }, { name: 'Dead hang', dose: '20 s' },
    ] },
  { key: 'cooldown_D', name: 'Cool-down: chest, lats, traps, neck', short: 'Cool-down', kind: 'prep', days: ['D'], sets: 0, lo: 0, hi: 0, start: null, step: 0, credit: {},
    note: 'Static holds, slow breathing.', icon: 'cheststretch', stretchWhich: 'chest',
    moves: [
      { name: 'Doorway chest stretch', dose: '45 s' }, { name: 'Lat stretch', dose: '30 s each side' },
      { name: 'Upper trap stretch', dose: '30 s each side' }, { name: 'Chin tucks against a wall', dose: '8 × 3 s' },
    ] },
]

/** Rest between exercises (after the skill session it's longer). */
export const TRANSITION_REST = 90
export const AFTER_SKILL_REST = 120

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.key, e]))

export const DAYS: Record<DayCode, { name: string; sub: string; keys: string[] }> = {
  A: { name: 'Pull + Arms', sub: 'About 60 min · warm-up · Thenx muscle-up · row · curls · triceps · face pulls · core · cool-down',
    keys: ['warmup_A', 'skill_muscleup', 'db_row', 'incline_curl', 'db_oh_triceps', 'face_pull', 'hollow_hold', 'cooldown_A'] },
  B: { name: 'Push + Arms', sub: 'About 60 min · warm-up · Thenx planche · dips · hammer curls · laterals · neck · core · cool-down',
    keys: ['warmup_B', 'skill_planche', 'dips', 'db_hammer', 'db_lateral', 'neck_curl_ext', 'hanging_knee_raise', 'cooldown_B'] },
  C: { name: 'Legs, Core + Knees', sub: 'About 55 min · knee & foot warm-up · quads · hamstrings · inner thighs · lower abs · carries · cool-down. No glute loading.',
    keys: ['warmup_C', 'leg_ext', 'step_down', 'leg_curl', 'copenhagen', 'reverse_crunch', 'suitcase_carry', 'cooldown_C'] },
  D: { name: 'Size Day', sub: 'About 60 min · no skill · incline press · pull-ups · rows · arms · rear delts · neck · core',
    keys: ['warmup_D', 'incline_db_press', 'pullup', 'cs_row', 'db_curl', 'triceps_pushdown', 'db_reardelt', 'neck_curl_ext', 'dead_bug', 'cooldown_D'] },
}

/** Training order through the week: Mon A → Tue C → Thu B → Sat D. */
export const DAY_ORDER: DayCode[] = ['A', 'C', 'B', 'D']
export const nextDay = (d: DayCode): DayCode => DAY_ORDER[(DAY_ORDER.indexOf(d) + 1) % DAY_ORDER.length]

export const GROUPS: { key: Group; label: string; lo: number; hi: number; note: string }[] = [
  { key: 'pull', label: 'Back / pull', lo: 12, hi: 18, note: 'mostly from muscle-up sessions' },
  { key: 'push', label: 'Chest / push', lo: 9, hi: 14, note: 'priority: a tight chest is fixed by stretching it and training it through a full range' },
  { key: 'arms', label: 'Arms', lo: 12, hi: 20, note: 'priority' },
  { key: 'shoulders', label: 'Shoulders', lo: 8, hi: 14, note: 'rear delts help posture' },
  { key: 'core', label: 'Core', lo: 14, hi: 24, note: 'priority #1: sitting, walking and swimming tall' },
  { key: 'neck', label: 'Neck', lo: 2, hi: 4, note: 'light, twice a week' },
  { key: 'posterior', label: 'Legs (quads + hams)', lo: 6, hi: 12, note: 'strength and alignment, not size; glutes are never loaded' },
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

/**
 * Optional posture reset (~8 min). No longer part of the plan: every stretch now lives in the
 * warm-ups and cool-downs, so rest days are real rest. Kept so it can still be logged.
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

// --- Swim: slow, long, technique. Distance goes up, speed does not matter. ---
export const SWIM = { start_m: 800, step_m: 100, max_m: 1500 }
export const SWIM_HOW = 'Easy pace (you could talk at the wall). Freestyle breathing every 3 strokes, every 4th length backstroke. No head-up breaststroke. Finish with 4 lengths of kick on your back.'

// --- Cardio / stretch / French options ---
export const CARDIO = {
  swim: { label: 'Swim', icon: 'swim', def: 35, variants: [['technique', 'Slow & long']] },
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
export const GOALS = { sessions: 4, focusHours: 15, proteinDays: 5 }
/** Daily protein, grams: about 1.8 g per kg (67 kg). Settings.protein_g overrides it. */
export const PROTEIN_G = 125
/** Quick-add protein buttons. */
export const PROTEIN_FOODS: [string, number][] = [
  ['Milk glass', 8], ['3 eggs', 18], ['Greek yogurt', 20], ['Whey scoop', 25], ['Tuna can', 25], ['Lentils cup', 18], ['Chicken palm', 45],
]

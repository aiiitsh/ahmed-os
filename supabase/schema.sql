-- ===== Ahmed OS schema =====
create extension if not exists "pgcrypto";

-- One row per user: app-wide state
create table public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rotation_next text not null default 'A' check (rotation_next in ('A','B','C','D')),
  skills jsonb not null default '{}'::jsonb,        -- see 7.2 seed
  french_unit int not null default 1,
  pending_bed_at timestamptz,                        -- set by "Going to bed"
  focus jsonb,                                       -- running timer {mode:'focus'|'break', kind:'work'|'study', started_at}
  active_session jsonb,                              -- in-progress workout (see 9.2)
  streak_pin_hash text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Current target per exercise (progression memory)
create table public.exercise_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  weight_kg numeric(5,2),          -- null for bodyweight/timed moves
  reps int not null,               -- reps or seconds
  last_feel text check (last_feel in ('easy','good','hard')),
  times_done int not null default 0,
  calibrated boolean not null default false,  -- false until the first real session
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_key)
);

-- Workouts (rotation sessions)
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  day_code text not null check (day_code in ('A','B','C','D')),
  started_at timestamptz not null,
  ended_at timestamptz,
  skill_key text,                 -- 'muscleup' | 'planche' | null
  skill_done boolean default false,
  skill_minutes int,
  ended_early boolean default false
);
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null,
  exercise_key text not null,
  name_used text not null,        -- the main or swap name actually done
  sets int,
  reps int,
  weight_kg numeric(5,2),
  feel text check (feel in ('easy','good','hard')),
  skipped boolean default false,
  next_weight_kg numeric(5,2),
  next_reps int
);

-- Sleep: one row per wake-up day
create table public.sleep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wake_date date not null,
  bed_at timestamptz,
  wake_at timestamptz,
  minutes int,
  unique (user_id, wake_date)
);

-- Focus blocks and breaks
create table public.focus_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  block_type text not null check (block_type in ('focus','break')),
  kind text check (kind in ('work','study')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  end_reason text check (end_reason in ('break','lost_focus','stop','resume'))
);

-- Quran: per-juz status
create table public.quran_juz (
  user_id uuid not null references auth.users(id) on delete cascade,
  juz int not null check (juz between 1 and 30),
  memorized boolean not null default false,
  last_revised date,
  last_memorized date,
  primary key (user_id, juz)
);

-- Generic quick logs: cardio, stretch, flag, protein, quran, french, bodyweight
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  local_date date not null,
  type text not null check (type in ('cardio','stretch','flag','protein','quran','french','bodyweight','photo')),
  data jsonb not null default '{}'::jsonb
);
-- data shapes:
-- cardio:     {sport:'swim'|'run'|'squash', variant:'sprints'|'endurance'|'technique'|'easy'|'intervals'|'long'|'match'|'drills', minutes:int}
-- stretch:    {which:'hip_flexors'|'chest'|'adductors'|'hamstrings'|'thenx_routine'}
-- flag:       {which:'lower_back_tight'}
-- protein:    {hit:true}
-- quran:      {juz:int, mode:'revise'|'memorize'}
-- french:     {activity:'book'|'vocab'|'listening'|'speaking'|'writing'|'finished_unit', minutes:int, unit:int}
-- bodyweight: {kg:number}
-- photo:      {storage_path:text}   -- optional monthly posture photo (phase 2)

-- Private habit streak (Streak tab)
create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  count int not null check (count >= 0),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- Friday reviews (written by the app's export, plus notes from Claude pasted back)
create table public.weekly_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,        -- a Saturday
  summary jsonb not null,
  claude_notes text,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Indexes
create index on public.workouts (user_id, local_date);
create index on public.workout_sets (user_id, workout_id);
create index on public.focus_blocks (user_id, local_date);
create index on public.logs (user_id, local_date, type);
create index on public.sleep (user_id, wake_date);
create index on public.habit_entries (user_id, entry_date);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['app_state','exercise_targets','workouts','workout_sets','sleep','focus_blocks','quran_juz','logs','habit_entries','weekly_reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Realtime: lets the laptop see phone logs within seconds (acceptance check, section 14).
alter publication supabase_realtime add table
  public.app_state, public.exercise_targets, public.workouts, public.workout_sets,
  public.sleep, public.focus_blocks, public.quran_juz, public.logs,
  public.habit_entries, public.weekly_reviews;

-- ===== Later migrations (also in supabase/migrations/) =====
-- 002: see supabase/migrations/002_sleep_segments_and_porn_flag.sql (run it after this file on a fresh project).

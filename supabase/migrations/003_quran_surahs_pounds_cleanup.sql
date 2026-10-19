-- 003: Quran by surah (learned / memorized / revised history), weights in pounds,
-- and removal of workouts that were left open for hours by mistake.
-- Safe to run more than once.

-- ---------- Quran: one row per event, so the full history is kept ----------
create table if not exists public.quran_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surah int not null check (surah between 1 and 114),
  kind text not null check (kind in ('learned', 'memorized', 'revised')),
  at timestamptz not null default now(),
  local_date date not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists quran_events_user_surah on public.quran_events (user_id, surah, at);
create index if not exists quran_events_user_date on public.quran_events (user_id, local_date);

alter table public.quran_events enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quran_events' and policyname = 'own rows') then
    create policy "own rows" on public.quran_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quran_events') then
    alter publication supabase_realtime add table public.quran_events;
  end if;
end $$;

-- ---------- Weights: kilograms → pounds (columns renamed so the data is self-describing) ----------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'exercise_targets' and column_name = 'weight_kg') then
    alter table public.exercise_targets rename column weight_kg to weight_lb;
    -- real gym steps: nearest 5 lb from 20 lb up, nearest 2.5 lb below that
    update public.exercise_targets set weight_lb = case when weight_lb * 2.20462 >= 20
      then round(weight_lb * 2.20462 / 5) * 5 else round(weight_lb * 2.20462 / 2.5) * 2.5 end
    where weight_lb is not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workout_sets' and column_name = 'weight_kg') then
    alter table public.workout_sets rename column weight_kg to weight_lb;
    alter table public.workout_sets rename column next_weight_kg to next_weight_lb;
    update public.workout_sets set
      weight_lb = case when weight_lb * 2.20462 >= 20 then round(weight_lb * 2.20462 / 5) * 5 else round(weight_lb * 2.20462 / 2.5) * 2.5 end,
      next_weight_lb = case when next_weight_lb * 2.20462 >= 20 then round(next_weight_lb * 2.20462 / 5) * 5 else round(next_weight_lb * 2.20462 / 2.5) * 2.5 end;
  end if;
end $$;
alter table public.exercise_targets alter column weight_lb type numeric(6,2);
alter table public.workout_sets alter column weight_lb type numeric(6,2);
alter table public.workout_sets alter column next_weight_lb type numeric(6,2);

-- ---------- Cleanup: workouts left open for more than 5 hours (e.g. the 17 h Day B on 15 Oct) ----------
delete from public.workouts where ended_at - started_at > interval '5 hours';

-- ---------- Check: expect quran_events_rls = true, targets_in_lb = 1, long_workouts_left = 0 ----------
select
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'quran_events') as quran_events_rls,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'exercise_targets' and column_name = 'weight_lb') as targets_in_lb,
  (select count(*) from public.workouts where ended_at - started_at > interval '5 hours') as long_workouts_left;

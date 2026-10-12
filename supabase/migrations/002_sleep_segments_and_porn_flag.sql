-- 002: multiple sleeps per day (naps, night wake-ups) + porn flag on streak entries.
-- Safe to run more than once.

-- Streak: mark days that involved porn (shown in red).
alter table public.habit_entries add column if not exists porn boolean not null default false;

-- Sleep: one row per stretch of sleep (Sleep → Woke up). Naps and night wakings are just more rows.
create table if not exists public.sleep_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz,                -- null if "Woke up" was pressed without "Sleep" first
  end_at timestamptz not null,
  wake_reason text,                    -- e.g. 'pee', 'no_reason', 'noise', 'other'
  created_at timestamptz not null default now()
);
create index if not exists sleep_segments_user_end on public.sleep_segments (user_id, end_at);

alter table public.sleep_segments enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sleep_segments' and policyname = 'own rows') then
    create policy "own rows" on public.sleep_segments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sleep_segments') then
    alter publication supabase_realtime add table public.sleep_segments;
  end if;
end $$;

-- Carry over anything logged in the old one-row-per-day table.
insert into public.sleep_segments (user_id, start_at, end_at)
select s.user_id, s.bed_at, s.wake_at
from public.sleep s
where s.wake_at is not null
  and not exists (select 1 from public.sleep_segments g where g.user_id = s.user_id and g.end_at = s.wake_at);

-- Check: expect porn_column = 1, sleep_segments_rls = true
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'habit_entries' and column_name = 'porn') as porn_column,
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'sleep_segments') as sleep_segments_rls;

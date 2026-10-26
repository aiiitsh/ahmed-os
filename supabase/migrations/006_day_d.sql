-- 4-day program: adds Day D (size day). Run once in the Supabase SQL editor before your first Day D (Saturday).
-- Without it, saving a Day D workout fails because the old check only allows A, B and C.

alter table public.workouts drop constraint if exists workouts_day_code_check;
alter table public.workouts add constraint workouts_day_code_check check (day_code in ('A','B','C','D'));

alter table public.app_state drop constraint if exists app_state_rotation_next_check;
alter table public.app_state add constraint app_state_rotation_next_check check (rotation_next in ('A','B','C','D'));

-- Check: expect both constraints to list 'D'
select conname, pg_get_constraintdef(oid) from pg_constraint
where conname in ('workouts_day_code_check', 'app_state_rotation_next_check');

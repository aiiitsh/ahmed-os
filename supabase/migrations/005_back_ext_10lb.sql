-- One-off: the 45° back extension in your most recent Day C was done with a 10 lb plate.
-- Sets that set to 10 lb, and makes 10 lb the current target. Needs migration 003 (pounds) first.

update public.workout_sets
set weight_lb = 10
where id = (
  select s.id
  from public.workout_sets s
  join public.workouts w on w.id = s.workout_id
  where s.exercise_key = 'back_ext_45' and not s.skipped
  order by w.started_at desc
  limit 1
);

update public.exercise_targets
set weight_lb = 10, updated_at = now()
where exercise_key = 'back_ext_45';

-- Check: expect latest_back_ext_lb = 10 and target_lb = 10
select
  (select s.weight_lb from public.workout_sets s join public.workouts w on w.id = s.workout_id
   where s.exercise_key = 'back_ext_45' order by w.started_at desc limit 1) as latest_back_ext_lb,
  (select w.local_date from public.workout_sets s join public.workouts w on w.id = s.workout_id
   where s.exercise_key = 'back_ext_45' order by w.started_at desc limit 1) as workout_date,
  (select weight_lb from public.exercise_targets where exercise_key = 'back_ext_45') as target_lb;

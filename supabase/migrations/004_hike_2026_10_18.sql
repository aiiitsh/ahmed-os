-- One-off: log the 21 km hike on Sun 18 Oct 2026 (skipped if a hike is already logged that day).
insert into public.logs (user_id, logged_at, local_date, type, data)
select a.user_id, '2026-10-18T16:00:00-04:00', '2026-10-18', 'cardio', '{"sport": "hike", "variant": "hike", "km": 21}'::jsonb
from public.app_state a
where not exists (
  select 1 from public.logs l
  where l.user_id = a.user_id and l.local_date = '2026-10-18' and l.type = 'cardio' and l.data->>'sport' = 'hike'
);

-- Check: expect hikes_on_18_oct = 1
select count(*) as hikes_on_18_oct from public.logs where local_date = '2026-10-18' and type = 'cardio' and data->>'sport' = 'hike';

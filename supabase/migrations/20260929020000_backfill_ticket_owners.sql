-- Older feedback tickets were linked to their sender only by name (user_id empty). Row Level
-- Security matches on user_id, so link them to the PWD with that exact name. Anonymous tickets
-- keep no owner; ambiguous names (shared by several PWDs) are left for staff to handle.
update public.feedback_tickets t
set user_id = u.id
from public.pwd_users u
where t.user_id is null
  and not coalesce(t.is_anonymous, false)
  and u.name = t.pwd_name
  and (select count(*) from public.pwd_users x where x.name = t.pwd_name) = 1;

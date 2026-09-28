-- Notifications without a user_id are broadcasts that every PWD sees. Several seeded ones were
-- personal ("Your account has been verified", "Your request REQ-LB-2024-002 … approved") but had no
-- owner, so every PWD — including brand-new, unverified accounts — saw them and could read another
-- person's request details.

-- A notification that names a request belongs to that request's owner.
update public.notifications n
set user_id = r.pwd_id
from public.assistance_requests r
where n.user_id is null
  and r.pwd_id is not null and r.pwd_id <> ''
  and n.message like '%' || r.id || '%';

-- The seeded account-verified and job-match messages were Maria's (the demo account).
update public.notifications
set user_id = 'PWD-LB-2024-0042'
where user_id is null
  and id in ('NOT-001', 'NOT-006')
  and exists (select 1 from public.pwd_users where id = 'PWD-LB-2024-0042');

-- Supabase Auth, step 2 of 2: real access control.
--
-- Before: every table had a `using (true)` policy, so anyone holding the public anon key (it is
-- in the website bundle) could read every record — including plaintext passwords — and change
-- or delete anything.
--
-- After:
--  * Passwords live only in Supabase Auth (bcrypt). The plaintext columns are dropped.
--  * Who is signed in comes from the Auth JWT's app_metadata {kind, account_id}, which only the
--    server (service role) can set. current_pwd_id() / is_staff() also re-check that the record
--    is still active, so deactivating or deleting an account cuts off access immediately.
--  * Guests see nothing. A PWD sees their own record, requests, tickets and notifications
--    (plus broadcast notifications), open programs and job listings. Active staff see everything.
--  * A PWD may only change their own profile fields; guard_columns() rejects any other change.
--  * Registration and admin-account changes need Auth users, so they go through the
--    register-pwd / admin-users Edge Functions (service role), not direct table writes.

do $$
begin
  if exists (select 1 from public.pwd_users where auth_id is null)
     or exists (select 1 from public.admin_users where auth_id is null) then
    raise exception 'Some accounts have no Supabase Auth user yet. Run `npm run auth:migrate` first.';
  end if;
end $$;

-- ── Identity helpers ──────────────────────────────────────────────
-- security definer: they read the account tables regardless of RLS (no policy recursion).

create or replace function public.login_email(p_kind text, p_id text)
returns text language sql immutable as $$
  -- Keep identical to loginEmail() in supabase/functions/_shared/account.ts.
  select p_kind || '.' || lower(regexp_replace(p_id, '[^A-Za-z0-9]+', '-', 'g')) || '@accounts.equalaccess.invalid'
$$;

create or replace function public.auth_account_id(p_kind text)
returns text language sql stable as $$
  select case when auth.jwt() -> 'app_metadata' ->> 'kind' = p_kind
              then auth.jwt() -> 'app_metadata' ->> 'account_id' end
$$;

create or replace function public.current_pwd_id()
returns text language sql stable security definer set search_path = public as $$
  select u.id from public.pwd_users u
  where u.id = public.auth_account_id('pwd') and u.deleted_at is null and coalesce(u.active, true)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = public.auth_account_id('admin') and coalesce(a.status, 'Active') = 'Active'
  )
$$;

-- Sign-in: PWD ID / username → the Auth email, for active accounts only. Callable before login.
create or replace function public.resolve_login(p_kind text, p_identifier text)
returns text language sql stable security definer set search_path = public as $$
  select public.login_email(p_kind, t.id) from (
    select id from public.pwd_users
    where p_kind = 'pwd' and deleted_at is null and coalesce(active, true) and auth_id is not null
      and lower(btrim(p_identifier)) in (lower(pwd_id_number), lower(username), lower(id))
    union all
    select id from public.admin_users
    where p_kind = 'admin' and coalesce(status, 'Active') = 'Active' and auth_id is not null
      and lower(btrim(p_identifier)) = lower(username)
  ) t
  limit 1
$$;

revoke all on function public.current_pwd_id() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.current_pwd_id() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.resolve_login(text, text) to anon, authenticated;

-- ── Column guard for self-service updates ─────────────────────────
-- Staff (and server-side callers, which carry no Auth user) may change anything. Anyone else may
-- only change the columns passed as trigger arguments.
create or replace function public.guard_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  if (to_jsonb(new) - tg_argv) is distinct from (to_jsonb(old) - tg_argv) then
    raise exception 'You can only change your own editable fields.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger pwd_users_guard before update on public.pwd_users for each row
  execute function public.guard_columns(
    'name', 'address', 'barangay', 'contact', 'email', 'avatar', 'skills', 'education_level', 'education',
    'work_experience', 'years_of_experience', 'certifications', 'job_interests', 'preferred_job_types',
    'preferred_work_setup', 'preferred_location', 'functional_capabilities', 'accessibility_needs',
    'accommodation_requirements', 'saved_job_ids');
create trigger assistance_requests_guard before update on public.assistance_requests for each row
  execute function public.guard_columns('pwd_name');
create trigger notifications_guard before update on public.notifications for each row
  execute function public.guard_columns('read');
create trigger feedback_tickets_guard before update on public.feedback_tickets for each row
  execute function public.guard_columns('pwd_name', 'responses', 'status');

-- ── Policies ──────────────────────────────────────────────────────
drop policy if exists "pwd_users_all" on public.pwd_users;
drop policy if exists "benefits_all" on public.benefits;
drop policy if exists "assistance_requests_all" on public.assistance_requests;
drop policy if exists "notifications_all" on public.notifications;
drop policy if exists "jobs_all" on public.jobs;
drop policy if exists "admin_users_all" on public.admin_users;
drop policy if exists "feedback_tickets_all" on public.feedback_tickets;
drop policy if exists "activity_log_all" on public.activity_log;
drop policy if exists "job_applications_all" on public.job_applications; -- unused table: now no access

-- PWD records. New records are created by the register-pwd function; the insert policy only
-- exists because the app saves with upsert (INSERT … ON CONFLICT UPDATE).
create policy pwd_users_read on public.pwd_users for select using (id = public.current_pwd_id() or public.is_staff());
create policy pwd_users_write on public.pwd_users for insert with check (id = public.current_pwd_id() or public.is_staff());
create policy pwd_users_update on public.pwd_users for update
  using (id = public.current_pwd_id() or public.is_staff()) with check (id = public.current_pwd_id() or public.is_staff());

-- Staff accounts: staff only. Creating/deleting accounts and passwords go through admin-users.
create policy admin_users_read on public.admin_users for select using (public.is_staff());
create policy admin_users_write on public.admin_users for insert with check (public.is_staff());
create policy admin_users_update on public.admin_users for update using (public.is_staff()) with check (public.is_staff());

-- Programs: PWDs see the ones open to them; staff manage all.
create policy benefits_read on public.benefits for select
  using (public.is_staff() or (public.current_pwd_id() is not null and status in ('Active', 'Approved')));
create policy benefits_insert on public.benefits for insert with check (public.is_staff());
create policy benefits_update on public.benefits for update using (public.is_staff()) with check (public.is_staff());
create policy benefits_delete on public.benefits for delete using (public.is_staff());

-- Job listings: any signed-in account reads; staff write.
create policy jobs_read on public.jobs for select using (public.is_staff() or public.current_pwd_id() is not null);
create policy jobs_insert on public.jobs for insert with check (public.is_staff());
create policy jobs_update on public.jobs for update using (public.is_staff()) with check (public.is_staff());

-- Assistance requests: own + staff. A PWD files requests as Pending under their own id.
create policy requests_read on public.assistance_requests for select
  using (pwd_id = public.current_pwd_id() or public.is_staff());
create policy requests_insert on public.assistance_requests for insert
  with check (public.is_staff() or (pwd_id = public.current_pwd_id() and status = 'Pending'));
create policy requests_update on public.assistance_requests for update
  using (pwd_id = public.current_pwd_id() or public.is_staff())
  with check (pwd_id = public.current_pwd_id() or public.is_staff());

-- Notifications: own + broadcast (user_id null) for PWDs; staff all.
create policy notifications_read on public.notifications for select
  using (public.is_staff() or user_id = public.current_pwd_id() or (user_id is null and public.current_pwd_id() is not null));
create policy notifications_insert on public.notifications for insert
  with check (public.is_staff() or user_id = public.current_pwd_id());
create policy notifications_update on public.notifications for update
  using (public.is_staff() or user_id = public.current_pwd_id() or (user_id is null and public.current_pwd_id() is not null))
  with check (public.is_staff() or user_id = public.current_pwd_id() or (user_id is null and public.current_pwd_id() is not null));

-- Feedback tickets: own (anonymous ones too — admins never see the owner) + staff.
create policy tickets_read on public.feedback_tickets for select
  using (user_id = public.current_pwd_id() or public.is_staff());
create policy tickets_insert on public.feedback_tickets for insert
  with check (public.is_staff() or (user_id = public.current_pwd_id() and status = 'Open'));
create policy tickets_update on public.feedback_tickets for update
  using (user_id = public.current_pwd_id() or public.is_staff())
  with check (user_id = public.current_pwd_id() or public.is_staff());

-- Activity log: signed-in accounts append; staff read (and clear, for a full rewrite).
create policy activity_read on public.activity_log for select using (public.is_staff());
create policy activity_insert on public.activity_log for insert
  with check (public.is_staff() or public.current_pwd_id() is not null);
create policy activity_delete on public.activity_log for delete using (public.is_staff());

-- ── Recapitulation: trust the Auth session, not a password argument ─
-- The report functions keep their (p_admin_id, p_secret) signature; p_secret is now ignored and
-- the caller must be signed in as that same, active admin.
create or replace function public.recap_assert_admin(p_admin_id text, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_admin_id is distinct from public.auth_account_id('admin') or not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.recap_assert_admin(text, text) from public, anon, authenticated;
-- Only a seed script (service role) should create the demo snapshot.
revoke execute on function public.seed_recapitulation_snapshot() from public, anon, authenticated;
revoke execute on function public.seed_recapitulation_disability_data() from public, anon, authenticated;

-- ── Passwords now live only in Supabase Auth ──────────────────────
alter table public.pwd_users drop column password;
alter table public.admin_users drop column password;

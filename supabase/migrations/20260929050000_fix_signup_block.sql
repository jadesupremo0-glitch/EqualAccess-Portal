-- Fix 20260929040000: Supabase Auth inserts the user first and writes custom app_metadata in a
-- later step, so checking app_metadata at insert time also rejected the portal's own
-- registrations. Instead, a new Auth user is allowed only when its email is the sign-in address
-- (login_email) of an existing PWD / staff record that has no Auth user yet. register-pwd,
-- admin-users and the provisioning scripts always create that record first; a public sign-up
-- never matches one, so it is refused.
create or replace function public.reject_public_signups()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.pwd_users u
    where u.auth_id is null and public.login_email('pwd', u.id) = lower(new.email)
    union all
    select 1 from public.admin_users a
    where a.auth_id is null and public.login_email('admin', a.id) = lower(new.email)
  ) then
    raise exception 'Sign-ups are closed. Register through the EqualAccess Portal.' using errcode = '42501';
  end if;
  return new;
end;
$$;

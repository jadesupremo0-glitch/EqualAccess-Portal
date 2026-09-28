-- Turn off public sign-ups at the database level.
--
-- Every real account is created server-side (register-pwd, admin-users, npm run seed /
-- auth:migrate) with app_metadata.kind = 'pwd' | 'admin', which only the service role can set.
-- Supabase's public /signup endpoint (and anonymous or social logins, if ever enabled) creates
-- users without it. Such users already had no access under Row Level Security; this refuses to
-- create them at all. Also switch off "Allow new users to sign up" in the dashboard
-- (Authentication → Sign In / Providers) when you have owner access — this trigger makes the
-- app safe either way.
create or replace function public.reject_public_signups()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'kind', '') not in ('pwd', 'admin') then
    raise exception 'Sign-ups are closed. Register through the EqualAccess Portal.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_public_signups on auth.users;
create trigger reject_public_signups before insert on auth.users
  for each row execute function public.reject_public_signups();

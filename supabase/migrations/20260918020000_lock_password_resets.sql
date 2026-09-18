-- Lock down password reset verification codes.
--
-- `password_resets` holds the 6-digit codes used for the "forgot password"
-- flow. Codes are only ever written/read by the Edge Functions, which use the
-- service_role key and bypass Row Level Security entirely. The previous
-- permissive policy (`using (true) with check (true)`) let anyone holding the
-- public anon key (embedded in the frontend bundle) SELECT an OTP out of the
-- database — completely defeating the email verification — or INSERT forged
-- rows and take over arbitrary accounts via the `reset-password` function.
--
-- This migration removes that policy, revokes all privileges for the
-- unauthenticated/authenticated roles, and installs a deny-all policy so the
-- codes are only reachable from within Edge Functions.
drop policy if exists "password_resets_all" on public.password_resets;

create policy "password_resets_deny_anon"
  on public.password_resets
  for all
  using (false)
  with check (false);

revoke all on table public.password_resets from anon, authenticated;
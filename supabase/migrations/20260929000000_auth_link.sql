-- Supabase Auth, step 1 of 2: link each PWD / admin record to its Supabase Auth user.
--
-- Accounts are provisioned by `npm run auth:migrate` (existing records) and by the
-- register-pwd / admin-users Edge Functions (new ones). Step 2
-- (20260929010000_auth_rls.sql) then locks the tables down and drops the plaintext
-- password columns, so it refuses to run until every record has an auth_id.
alter table public.pwd_users add column if not exists auth_id uuid unique;
alter table public.admin_users add column if not exists auth_id uuid unique;

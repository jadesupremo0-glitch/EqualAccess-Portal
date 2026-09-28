-- Count wrong guesses per password-reset code. The reset-password Edge Function burns a code
-- after 5 incorrect attempts, so the 6-digit code cannot be brute-forced during its 15 minutes.
alter table public.password_resets add column if not exists attempts integer not null default 0;

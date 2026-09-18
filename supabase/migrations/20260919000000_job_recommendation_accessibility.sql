-- EqualAccess Portal — job recommendation accessibility fields (v3)
-- Optional, volunteered profile fields used by the hybrid scoring engine.
-- Existing records keep their defaults; the engine skips the accessibility
-- layer gracefully when these are missing.

alter table public.pwd_users add column if not exists preferred_location text;

alter table public.jobs add column if not exists screen_or_visual_demands jsonb default '[]'::jsonb;
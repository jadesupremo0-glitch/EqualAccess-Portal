-- EqualAccess Portal — initial schema
-- Note: app-generated text-based IDs (e.g. PWD-LB-2024-0042) are the primary keys.
-- Nested structures (comments, timeline, responses, skills, etc.) are stored as JSONB
-- to match the shape used by the frontend store.

-- ── PWD users ─────────────────────────────────────────────────────
create table public.pwd_users (
  id text primary key,
  username text not null,
  password text not null,
  name text not null,
  address text default '',
  barangay text default '',
  age numeric,
  contact text default '',
  email text default '',
  disability_type text default 'Other',
  verification_status text default 'Pending',
  date_registered text default '',
  pwd_id_number text default '',
  avatar text,
  active boolean default true,
  skills jsonb default '[]'::jsonb,
  education text default '',
  work_experience text default '',
  years_of_experience numeric,
  certifications jsonb default '[]'::jsonb,
  job_interests jsonb default '[]'::jsonb,
  preferred_job_types jsonb default '[]'::jsonb,
  preferred_work_setup jsonb default '[]'::jsonb,
  functional_capabilities jsonb default '[]'::jsonb,
  accessibility_needs jsonb default '[]'::jsonb,
  accommodation_requirements jsonb default '[]'::jsonb
);

-- ── Benefit programs ──────────────────────────────────────────────
create table public.benefits (
  id text primary key,
  name text not null,
  category text default '',
  description text default '',
  eligibility text default '',
  barangay text default 'All Barangays',
  application_deadline text default '',
  date text default '',
  time text default '',
  status text default 'Active',
  requirements jsonb default '[]'::jsonb,
  benefits jsonb default '[]'::jsonb,
  contact_person text default 'PDAO Office',
  contact_number text default ''
);

-- ── Assistance requests ───────────────────────────────────────────
create table public.assistance_requests (
  id text primary key,
  pwd_name text default '',
  pwd_id text default '',
  type text default '',
  title text default '',
  description text default '',
  date_submitted text default '',
  last_updated text default '',
  status text default 'Pending',
  assigned_staff text default 'Unassigned',
  comments jsonb default '[]'::jsonb,
  timeline jsonb default '[]'::jsonb
);

-- ── Notifications ─────────────────────────────────────────────────
create table public.notifications (
  id text primary key,
  type text default 'info',
  title text default '',
  message text default '',
  date text default '',
  read boolean default false,
  user_id text
);

-- ── Jobs ──────────────────────────────────────────────────────────
create table public.jobs (
  id text primary key,
  title text default '',
  company text default '',
  location text default '',
  type text default 'Full-time',
  category text,
  salary text,
  description text default '',
  skills jsonb default '[]'::jsonb,
  preferred_skills jsonb default '[]'::jsonb,
  education_requirement text,
  experience_requirement text,
  work_setup text,
  workplace_conditions jsonb default '[]'::jsonb,
  accessibility_info text default '',
  accessibility_features jsonb default '[]'::jsonb,
  physical_requirements jsonb default '[]'::jsonb,
  communication_requirements jsonb default '[]'::jsonb,
  functional_requirements jsonb default '[]'::jsonb,
  accommodation_support text default '',
  posted_date text default '',
  deadline text default '',
  status text default 'Active',
  match_percent numeric,
  match_reasons jsonb default '[]'::jsonb
);

-- ── Admin users ───────────────────────────────────────────────────
create table public.admin_users (
  id text primary key,
  name text default '',
  position text default '',
  username text not null,
  password text default '',
  contact text,
  email text,
  role text default 'Administrator',
  status text default 'Active',
  last_login text default 'Never',
  date_created text default ''
);

-- ── Feedback tickets ──────────────────────────────────────────────
create table public.feedback_tickets (
  id text primary key,
  pwd_name text default '',
  is_anonymous boolean default false,
  subject text default '',
  category text default 'Feedback',
  message text default '',
  date_submitted text default '',
  status text default 'Open',
  assigned_staff text default 'Unassigned',
  responses jsonb default '[]'::jsonb,
  user_id text
);

-- ── Activity log ──────────────────────────────────────────────────
create table public.activity_log (
  id bigint generated always as identity primary key,
  "user" text default '',
  action text default '',
  date text default '',
  time text default '',
  activity text default ''
);

-- ── Job applications ──────────────────────────────────────────────
create table public.job_applications (
  id text primary key,
  user_id text default '',
  job_id text default '',
  job_title text default '',
  company text default '',
  applied_date text default ''
);

-- ── Row Level Security ────────────────────────────────────────────
-- The app currently authenticates in-app (username+password stored in
-- the DB) rather than via Supabase Auth. For simplicity the tables are
-- accessibly by all clients with the anon key. Tighten this if you add
-- Supabase Auth later.
alter table public.pwd_users enable row level security;
alter table public.benefits enable row level security;
alter table public.assistance_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.jobs enable row level security;
alter table public.admin_users enable row level security;
alter table public.feedback_tickets enable row level security;
alter table public.activity_log enable row level security;
alter table public.job_applications enable row level security;

create policy "pwd_users_all" on public.pwd_users for all using (true) with check (true);
create policy "benefits_all" on public.benefits for all using (true) with check (true);
create policy "assistance_requests_all" on public.assistance_requests for all using (true) with check (true);
create policy "notifications_all" on public.notifications for all using (true) with check (true);
create policy "jobs_all" on public.jobs for all using (true) with check (true);
create policy "admin_users_all" on public.admin_users for all using (true) with check (true);
create policy "feedback_tickets_all" on public.feedback_tickets for all using (true) with check (true);
create policy "activity_log_all" on public.activity_log for all using (true) with check (true);
create policy "job_applications_all" on public.job_applications for all using (true) with check (true);
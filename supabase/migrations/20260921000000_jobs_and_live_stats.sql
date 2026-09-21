-- EqualAccess Portal — job listings module, PWD soft-delete, and live dashboard aggregates.
--
-- Notes
--  * Barangay and disability type are plain text columns (no enum, check constraint or
--    lookup table), so the two new disability options ("Rare Disease (RA 10747)" and
--    "Speech & Language Impairment") and the 14-barangay list need no schema change:
--    existing records stay valid and nothing is rewritten. The lists live in
--    src/lib/catalog.ts.
--  * The `jobs` columns from the previous schema (type, work_setup, education_requirement,
--    accessibility_features, ...) are left in place and are read by the app for rows that
--    have not been re-saved yet. Run `npm run seed` for a clean, fully migrated demo set.

-- ── PWD profile / soft delete ─────────────────────────────────────
alter table public.pwd_users add column if not exists education_level text;
alter table public.pwd_users add column if not exists saved_job_ids jsonb default '[]'::jsonb;
-- Soft delete: a non-null deleted_at removes the record from every count and list.
alter table public.pwd_users add column if not exists deleted_at text;

-- ── Job listings ──────────────────────────────────────────────────
alter table public.jobs add column if not exists employment_type text default 'Full-time';
alter table public.jobs add column if not exists work_arrangement text default 'On-site';
alter table public.jobs add column if not exists min_education text default '';
-- Empty array = open to all disability types.
alter table public.jobs add column if not exists suitable_disabilities jsonb default '[]'::jsonb;
alter table public.jobs add column if not exists accommodations jsonb default '[]'::jsonb;
alter table public.jobs add column if not exists slots integer default 1;

-- Carry existing listings over: status vocabulary is now Draft / Open / Closed / Archived.
update public.jobs set
  employment_type = case type
    when 'Part-time' then 'Part-time'
    when 'Contract' then 'Contractual'
    else 'Full-time'
  end,
  work_arrangement = case
    when type = 'Remote' or work_setup = 'Remote' then 'Remote'
    when work_setup = 'Hybrid' then 'Hybrid'
    else 'On-site'
  end,
  status = case status
    when 'Active' then 'Open'
    when 'Inactive' then 'Closed'
    when 'Closed' then 'Closed'
    when 'Open' then 'Open'
    when 'Archived' then 'Archived'
    else 'Draft'
  end;

-- ── Job interests / applications ──────────────────────────────────
-- Status: Submitted → Under Review → Referred → Hired / Not Selected.
alter table public.job_applications add column if not exists status text default 'Submitted';
alter table public.job_applications add column if not exists created_at text;
alter table public.job_applications add column if not exists updated_at text;

update public.job_applications set
  created_at = coalesce(created_at, nullif(applied_date, ''), to_char(now() at time zone 'Asia/Manila', 'YYYY-MM-DD')),
  updated_at = coalesce(updated_at, created_at, nullif(applied_date, ''), to_char(now() at time zone 'Asia/Manila', 'YYYY-MM-DD'))
where created_at is null or updated_at is null;

-- ── Live dashboard aggregates ─────────────────────────────────────
-- Every dashboard number is computed here, inside the database, so it always reflects the
-- current rows. It mirrors computeRawStats() in src/lib/stats.ts (which the tests pin):
--   PWDs      : deleted_at is null; Verified / Rejected / everything else = pending
--   requests  : approved = Approved, Available, Claimed, Completed; rejected = Rejected;
--               pending = everything else (Pending, Under Review, Requirements Needed)
--   this month: registered in the current calendar month, Asia/Manila
-- Group rows are returned with the values as stored; the app maps them onto the official
-- barangay / disability lists (so zero-count barangays still appear, and off-list values are
-- reported rather than dropped).
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  with live as (
    select * from public.pwd_users where deleted_at is null
  ),
  req as (
    select * from public.assistance_requests
  )
  select jsonb_build_object(
    'totalPwds',    (select count(*) from live),
    'verifiedPwds', (select count(*) from live where verification_status = 'Verified'),
    'pendingPwds',  (select count(*) from live where coalesce(verification_status, 'Pending') not in ('Verified', 'Rejected')),
    'rejectedPwds', (select count(*) from live where verification_status = 'Rejected'),
    'newThisMonth', (
      select count(*) from live
      where left(date_registered, 7) = to_char(now() at time zone 'Asia/Manila', 'YYYY-MM')
    ),

    'totalRequests',    (select count(*) from req),
    'approvedRequests', (select count(*) from req where status in ('Approved', 'Available', 'Claimed', 'Completed')),
    'pendingRequests',  (select count(*) from req where coalesce(status, 'Pending') not in ('Approved', 'Available', 'Claimed', 'Completed', 'Rejected')),
    'rejectedRequests', (select count(*) from req where status = 'Rejected'),

    'requestsByMonth', (
      select coalesce(jsonb_agg(jsonb_build_object('name', m, 'count', c) order by m), '[]'::jsonb)
      from (select left(date_submitted, 7) as m, count(*) as c from req where coalesce(date_submitted, '') <> '' group by 1) t
    ),
    'pwdsByBarangay', (
      select coalesce(jsonb_agg(jsonb_build_object('name', b, 'count', c) order by b), '[]'::jsonb)
      from (select coalesce(barangay, '') as b, count(*) as c from live group by 1) t
    ),
    'pwdsByDisability', (
      select coalesce(jsonb_agg(jsonb_build_object('name', d, 'count', c) order by d), '[]'::jsonb)
      from (select coalesce(disability_type, '') as d, count(*) as c from live group by 1) t
    ),
    'requestsByType', (
      select coalesce(jsonb_agg(jsonb_build_object('name', ty, 'count', c) order by ty), '[]'::jsonb)
      from (select coalesce(type, '') as ty, count(*) as c from req group by 1) t
    )
  );
$$;

grant execute on function public.dashboard_stats() to anon, authenticated;

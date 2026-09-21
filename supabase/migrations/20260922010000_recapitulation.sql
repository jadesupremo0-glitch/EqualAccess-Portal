-- EqualAccess Portal — PWD Recapitulation (admin module).
--
-- "Total Number Strength of Persons With Disabilities in Los Baños": per-barangay counts by
-- age bracket plus the DOH PRPWD encoding status, kept as dated snapshots.
--
-- Security model
--  * The app signs admins in itself (username + password stored in admin_users), not with
--    Supabase Auth, so the database cannot see "who is logged in". Instead every admin-only
--    function below takes the admin's id and password and re-checks them here
--    (recap_assert_admin). Guests and PWD users cannot read drafts or change anything.
--  * There are NO insert/update/delete policies on the recapitulation tables: they can only
--    be changed through save_recap_report / delete_recap_report, which run as one transaction.
--  * The only direct read allowed is the public landing page: a report that is published AND
--    flagged show_on_landing.
--  * Totals and percentages are generated columns, so the database always computes them;
--    a client can never store a wrong total.

-- ── Tables ────────────────────────────────────────────────────────
create table public.recapitulation_reports (
  id uuid primary key default gen_random_uuid(),
  report_title text not null default 'Total Number Strength of Persons With Disabilities in Los Baños',
  as_of_date date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Show this (published) report, read-only, on the public landing page. At most one at a time.
  show_on_landing boolean not null default false,
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recapitulation_reports_one_per_date unique (as_of_date),
  constraint recapitulation_landing_needs_published check (not show_on_landing or status = 'published')
);

create table public.recapitulation_barangay_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.recapitulation_reports(id) on delete cascade,
  barangay_code text not null check (barangay_code ~ '^0(0[1-9]|1[0-4])$'),
  barangay_name text not null,
  age_0_59 integer not null default 0 check (age_0_59 >= 0),
  age_60_above integer not null default 0 check (age_60_above >= 0),
  -- Always derived, never supplied.
  total integer generated always as (age_0_59 + age_60_above) stored,
  sort_order integer not null default 0,
  constraint recapitulation_rows_one_per_barangay unique (report_id, barangay_code)
);

create table public.recapitulation_prpwd_status (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.recapitulation_reports(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  reference_date date,
  total_pwds integer not null default 0 check (total_pwds >= 0),
  total_encoded integer not null default 0 check (total_encoded >= 0),
  -- Always derived; 0 when there are no PWDs (no division by zero).
  percentage integer generated always as (
    case when total_pwds > 0 then round(total_encoded::numeric * 100 / total_pwds)::integer else 0 end
  ) stored,
  sort_order integer not null default 0,
  constraint recapitulation_encoded_within_total check (total_encoded <= total_pwds)
);

create index recapitulation_rows_report_idx on public.recapitulation_barangay_rows (report_id, sort_order);
create index recapitulation_prpwd_report_idx on public.recapitulation_prpwd_status (report_id, sort_order);

-- ── Row level security ────────────────────────────────────────────
alter table public.recapitulation_reports enable row level security;
alter table public.recapitulation_barangay_rows enable row level security;
alter table public.recapitulation_prpwd_status enable row level security;

create policy "recap_reports_public_read" on public.recapitulation_reports
  for select using (status = 'published' and show_on_landing);

create policy "recap_rows_public_read" on public.recapitulation_barangay_rows
  for select using (exists (
    select 1 from public.recapitulation_reports r
    where r.id = report_id and r.status = 'published' and r.show_on_landing
  ));

create policy "recap_prpwd_public_read" on public.recapitulation_prpwd_status
  for select using (exists (
    select 1 from public.recapitulation_reports r
    where r.id = report_id and r.status = 'published' and r.show_on_landing
  ));

-- ── Admin check ───────────────────────────────────────────────────
create or replace function public.recap_assert_admin(p_admin_id text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_secret, '') = '' or not exists (
    select 1 from public.admin_users
    where id = p_admin_id and password = p_secret and coalesce(status, 'Active') = 'Active'
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.recap_assert_admin(text, text) from public, anon, authenticated;

-- ── Read (admin): every report with its rows, newest snapshot first ─
create or replace function public.get_recap_reports(p_admin_id text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recap_assert_admin(p_admin_id, p_secret);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'title', r.report_title,
      'asOfDate', r.as_of_date,
      'status', r.status,
      'showOnLanding', r.show_on_landing,
      'createdBy', r.created_by,
      'updatedBy', r.updated_by,
      'createdAt', r.created_at,
      'updatedAt', r.updated_at,
      'rows', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', b.barangay_code, 'name', b.barangay_name,
          'age0to59', b.age_0_59, 'age60above', b.age_60_above, 'total', b.total
        ) order by b.sort_order), '[]'::jsonb)
        from public.recapitulation_barangay_rows b where b.report_id = r.id
      ),
      'prpwd', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'label', p.label, 'referenceDate', p.reference_date,
          'totalPwds', p.total_pwds, 'totalEncoded', p.total_encoded, 'percentage', p.percentage
        ) order by p.sort_order), '[]'::jsonb)
        from public.recapitulation_prpwd_status p where p.report_id = r.id
      )
    ) order by r.as_of_date desc)
    from public.recapitulation_reports r
  ), '[]'::jsonb);
end;
$$;

-- ── Write (admin): create or replace a report and all its rows, atomically ─
-- p_rows  : [{ "code": "001", "name": "Anos", "age0to59": 613, "age60above": 125 }, … 14 of them]
-- p_prpwd : [{ "label": "…", "referenceDate": "2026-04-30" | null, "totalPwds": 7934, "totalEncoded": 6869 }, …]
-- A function body is a single transaction: if anything fails, nothing is written.
create or replace function public.save_recap_report(
  p_admin_id text,
  p_secret text,
  p_report_id uuid,
  p_title text,
  p_as_of date,
  p_status text,
  p_show_on_landing boolean,
  p_rows jsonb,
  p_prpwd jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_report_id;
  v_existing uuid;
  v_title text := coalesce(nullif(btrim(p_title), ''), 'Total Number Strength of Persons With Disabilities in Los Baños');
  v_landing boolean := coalesce(p_show_on_landing, false) and p_status = 'published';
  v_row jsonb;
  v_i integer := 0;
  v_codes text[] := '{}';
  v_code text;
  v_name text;
  v_total integer;
  v_encoded integer;
begin
  perform public.recap_assert_admin(p_admin_id, p_secret);

  if p_as_of is null then raise exception 'The "as of" date is required'; end if;
  if p_status not in ('draft', 'published') then raise exception 'Status must be draft or published'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) <> 14 then
    raise exception 'A report needs exactly 14 barangay rows';
  end if;
  if jsonb_typeof(coalesce(p_prpwd, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'PRPWD status must be a list';
  end if;

  -- One report per as-of date. The caller gets the existing id so it can offer "update existing".
  select id into v_existing from public.recapitulation_reports
    where as_of_date = p_as_of and id is distinct from v_id;
  if v_existing is not null then
    raise exception 'duplicate_as_of' using errcode = '23505', detail = v_existing::text;
  end if;

  -- Validate every barangay row before touching anything.
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_code := v_row->>'code';
    v_name := btrim(coalesce(v_row->>'name', ''));
    if v_code is null or v_code !~ '^0(0[1-9]|1[0-4])$' then raise exception 'Invalid barangay code: %', coalesce(v_code, '(none)'); end if;
    if v_code = any(v_codes) then raise exception 'Barangay % appears twice', v_code; end if;
    if v_name = '' then raise exception 'Barangay % needs a name', v_code; end if;
    if coalesce(v_row->>'age0to59', '') !~ '^\d{1,9}$' or coalesce(v_row->>'age60above', '') !~ '^\d{1,9}$' then
      raise exception 'Barangay % needs whole numbers of 0 or more', v_code;
    end if;
    v_codes := v_codes || v_code;
  end loop;

  for v_row in select * from jsonb_array_elements(coalesce(p_prpwd, '[]'::jsonb)) loop
    if btrim(coalesce(v_row->>'label', '')) = '' then raise exception 'Every PRPWD row needs a label'; end if;
    if coalesce(v_row->>'totalPwds', '') !~ '^\d{1,9}$' or coalesce(v_row->>'totalEncoded', '') !~ '^\d{1,9}$' then
      raise exception 'PRPWD "%" needs whole numbers of 0 or more', v_row->>'label';
    end if;
    v_total := (v_row->>'totalPwds')::integer;
    v_encoded := (v_row->>'totalEncoded')::integer;
    if v_encoded > v_total then
      raise exception 'PRPWD "%": encoded (%) cannot exceed total PWDs (%)', v_row->>'label', v_encoded, v_total;
    end if;
    if coalesce(v_row->>'referenceDate', '') <> '' and (v_row->>'referenceDate') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'PRPWD "%": reference date must be YYYY-MM-DD', v_row->>'label';
    end if;
  end loop;

  -- Only one report at a time is shown on the landing page.
  if v_landing then
    update public.recapitulation_reports set show_on_landing = false where id is distinct from v_id and show_on_landing;
  end if;

  if v_id is null then
    insert into public.recapitulation_reports (report_title, as_of_date, status, show_on_landing, created_by, updated_by)
    values (v_title, p_as_of, p_status, v_landing, p_admin_id, p_admin_id)
    returning id into v_id;
  else
    update public.recapitulation_reports
      set report_title = v_title, as_of_date = p_as_of, status = p_status, show_on_landing = v_landing,
          updated_by = p_admin_id, updated_at = now()
      where id = v_id;
    if not found then raise exception 'Report not found'; end if;
    delete from public.recapitulation_barangay_rows where report_id = v_id;
    delete from public.recapitulation_prpwd_status where report_id = v_id;
  end if;

  v_i := 0;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_i := v_i + 1;
    insert into public.recapitulation_barangay_rows (report_id, barangay_code, barangay_name, age_0_59, age_60_above, sort_order)
    values (v_id, v_row->>'code', btrim(v_row->>'name'), (v_row->>'age0to59')::integer, (v_row->>'age60above')::integer, v_i);
  end loop;

  v_i := 0;
  for v_row in select * from jsonb_array_elements(coalesce(p_prpwd, '[]'::jsonb)) loop
    v_i := v_i + 1;
    insert into public.recapitulation_prpwd_status (report_id, label, reference_date, total_pwds, total_encoded, sort_order)
    values (v_id, btrim(v_row->>'label'), nullif(v_row->>'referenceDate', '')::date,
            (v_row->>'totalPwds')::integer, (v_row->>'totalEncoded')::integer, v_i);
  end loop;

  return v_id;
end;
$$;

create or replace function public.delete_recap_report(p_admin_id text, p_secret text, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recap_assert_admin(p_admin_id, p_secret);
  delete from public.recapitulation_reports where id = p_report_id;
  if not found then raise exception 'Report not found'; end if;
end;
$$;

grant execute on function public.get_recap_reports(text, text) to anon, authenticated;
grant execute on function public.save_recap_report(text, text, uuid, text, date, text, boolean, jsonb, jsonb) to anon, authenticated;
grant execute on function public.delete_recap_report(text, text, uuid) to anon, authenticated;

-- ── Seeder: the official snapshot as of April 30, 2026 ────────────
-- Idempotent: does nothing if a report for that date already exists. Run again any time with
-- `npm run seed:recap`. It refuses to finish unless the totals are exactly 6,727 / 1,207 / 7,934.
create or replace function public.seed_recapitulation_snapshot()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_a integer;
  v_b integer;
  v_t integer;
begin
  select id into v_id from public.recapitulation_reports where as_of_date = date '2026-04-30';
  if v_id is not null then return v_id; end if;

  insert into public.recapitulation_reports (as_of_date, status, show_on_landing, created_by, updated_by)
  values (date '2026-04-30', 'published', false, 'seed', 'seed')
  returning id into v_id;

  insert into public.recapitulation_barangay_rows (report_id, barangay_code, barangay_name, age_0_59, age_60_above, sort_order)
  select v_id, code, name, a, b, code::integer
  from (values
    ('001', 'Anos', 613, 125),
    ('002', 'Bagong Silang', 28, 7),
    ('003', 'Bambang', 413, 63),
    ('004', 'Batong Malake', 1001, 207),
    ('005', 'Baybayin', 98, 26),
    ('006', 'Bayog', 514, 84),
    ('007', 'Lalakay', 271, 40),
    ('008', 'Maahas', 440, 86),
    ('009', 'Malinta', 390, 44),
    ('010', 'Mayondon', 1058, 200),
    ('011', 'Putho-Tuntungin', 543, 95),
    ('012', 'San Antonio', 796, 117),
    ('013', 'Tadlac', 151, 23),
    ('014', 'Timugan', 411, 90)
  ) as t(code, name, a, b);

  insert into public.recapitulation_prpwd_status (report_id, label, reference_date, total_pwds, total_encoded, sort_order)
  values
    (v_id, 'DOH PRPWD ENCODED', date '2026-04-30', 7934, 6869, 1),
    (v_id, 'Request Overtime', date '2024-02-14', 6110, 1787, 2);

  select sum(age_0_59), sum(age_60_above), sum(total) into v_a, v_b, v_t
    from public.recapitulation_barangay_rows where report_id = v_id;
  if v_a <> 6727 or v_b <> 1207 or v_t <> 7934 then
    raise exception 'Seed totals are wrong: % / % / % (expected 6727 / 1207 / 7934)', v_a, v_b, v_t;
  end if;

  return v_id;
end;
$$;
grant execute on function public.seed_recapitulation_snapshot() to anon, authenticated;

select public.seed_recapitulation_snapshot();

-- EqualAccess Portal — Disability Data of Los Baños (second tab of the Recapitulation page).
--
-- Same snapshot model as 20260922010000_recapitulation.sql: a "report" (recapitulation_reports,
-- one per as-of date) now also owns a Disability Data matrix — count of registered PWDs per
-- disability type, broken down by age bracket (0-17, 18-30, 31-59, 60+) and sex.
--
-- Security model is unchanged: no insert/update/delete policies on the new table; every write goes
-- through save_recap_report (extended below to also take p_disability_rows), which re-checks the
-- admin's id + password. Reads go through get_recap_reports (extended to return "disabilityRows").
-- Totals are a generated column, so the database always computes them.

create table public.recapitulation_disability_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.recapitulation_reports(id) on delete cascade,
  disability_type text not null check (disability_type in (
    'Cancer (RA 11215)', 'Deaf or Hard of Hearing', 'Intellectual Disability', 'Learning Disability',
    'Mental Disability', 'Physical Disability', 'Psychosocial Disability', 'Rare Disease (RA 10747)',
    'Speech & Language Impairment', 'Visual Disability'
  )),
  female_0_17 integer not null default 0 check (female_0_17 >= 0),
  male_0_17 integer not null default 0 check (male_0_17 >= 0),
  female_18_30 integer not null default 0 check (female_18_30 >= 0),
  male_18_30 integer not null default 0 check (male_18_30 >= 0),
  female_31_59 integer not null default 0 check (female_31_59 >= 0),
  male_31_59 integer not null default 0 check (male_31_59 >= 0),
  female_60_above integer not null default 0 check (female_60_above >= 0),
  male_60_above integer not null default 0 check (male_60_above >= 0),
  -- Always derived, never supplied.
  total integer generated always as (
    female_0_17 + male_0_17 + female_18_30 + male_18_30 + female_31_59 + male_31_59 + female_60_above + male_60_above
  ) stored,
  sort_order integer not null default 0,
  constraint recapitulation_disability_one_per_type unique (report_id, disability_type)
);

create index recapitulation_disability_report_idx on public.recapitulation_disability_rows (report_id, sort_order);

alter table public.recapitulation_disability_rows enable row level security;

-- Same public-read rule as the other recapitulation tables: only a published report flagged
-- show_on_landing is readable without admin credentials.
create policy "recap_disability_public_read" on public.recapitulation_disability_rows
  for select using (exists (
    select 1 from public.recapitulation_reports r
    where r.id = report_id and r.status = 'published' and r.show_on_landing
  ));

-- ── Read (admin): reports now also carry disabilityRows ────────────
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
      ),
      'disabilityRows', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'disabilityType', d.disability_type,
          'female0to17', d.female_0_17, 'male0to17', d.male_0_17,
          'female18to30', d.female_18_30, 'male18to30', d.male_18_30,
          'female31to59', d.female_31_59, 'male31to59', d.male_31_59,
          'female60above', d.female_60_above, 'male60above', d.male_60_above,
          'total', d.total
        ) order by d.sort_order), '[]'::jsonb)
        from public.recapitulation_disability_rows d where d.report_id = r.id
      )
    ) order by r.as_of_date desc)
    from public.recapitulation_reports r
  ), '[]'::jsonb);
end;
$$;

-- ── Write (admin): create or replace a report, its barangay rows, PRPWD rows, AND disability rows ─
-- p_disability_rows: [{ "disabilityType": "Cancer (RA 11215)", "female0to17": 4, "male0to17": 2,
--   "female18to30": 12, "male18to30": 6, "female31to59": 204, "male31to59": 30,
--   "female60above": 46, "male60above": 11 }, … up to 10 of them]
create or replace function public.save_recap_report(
  p_admin_id text,
  p_secret text,
  p_report_id uuid,
  p_title text,
  p_as_of date,
  p_status text,
  p_show_on_landing boolean,
  p_rows jsonb,
  p_prpwd jsonb,
  p_disability_rows jsonb default '[]'::jsonb
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
  v_types text[] := '{}';
  v_type text;
  v_field text;
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
  if jsonb_typeof(coalesce(p_disability_rows, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'Disability data must be a list';
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

  -- Validate every disability row: a known type, not repeated, and whole non-negative counts.
  for v_row in select * from jsonb_array_elements(coalesce(p_disability_rows, '[]'::jsonb)) loop
    v_type := v_row->>'disabilityType';
    if v_type is null or v_type not in (
      'Cancer (RA 11215)', 'Deaf or Hard of Hearing', 'Intellectual Disability', 'Learning Disability',
      'Mental Disability', 'Physical Disability', 'Psychosocial Disability', 'Rare Disease (RA 10747)',
      'Speech & Language Impairment', 'Visual Disability'
    ) then
      raise exception 'Unknown disability type: %', coalesce(v_type, '(none)');
    end if;
    if v_type = any(v_types) then raise exception 'Disability type "%" appears twice', v_type; end if;
    v_types := v_types || v_type;
    foreach v_field in array array['female0to17','male0to17','female18to30','male18to30','female31to59','male31to59','female60above','male60above'] loop
      if coalesce(v_row->>v_field, '') !~ '^\d{1,9}$' then
        raise exception '%: % needs a whole number of 0 or more', v_type, v_field;
      end if;
    end loop;
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
    delete from public.recapitulation_disability_rows where report_id = v_id;
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

  v_i := 0;
  for v_row in select * from jsonb_array_elements(coalesce(p_disability_rows, '[]'::jsonb)) loop
    v_i := v_i + 1;
    insert into public.recapitulation_disability_rows (
      report_id, disability_type, female_0_17, male_0_17, female_18_30, male_18_30,
      female_31_59, male_31_59, female_60_above, male_60_above, sort_order
    )
    values (
      v_id, v_row->>'disabilityType',
      (v_row->>'female0to17')::integer, (v_row->>'male0to17')::integer,
      (v_row->>'female18to30')::integer, (v_row->>'male18to30')::integer,
      (v_row->>'female31to59')::integer, (v_row->>'male31to59')::integer,
      (v_row->>'female60above')::integer, (v_row->>'male60above')::integer,
      v_i
    );
  end loop;

  return v_id;
end;
$$;

grant execute on function public.save_recap_report(text, text, uuid, text, date, text, boolean, jsonb, jsonb, jsonb) to anon, authenticated;

-- ── Seeder: extend the official April 30, 2026 snapshot with the Disability Data matrix ─
-- Idempotent, like the barangay seeder: does nothing if the report already has disability rows.
-- Refuses to finish unless the grand total is exactly 7,934 (same population as the barangay recap).
create or replace function public.seed_recapitulation_disability_data()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing integer;
  v_grand integer;
begin
  select id into v_id from public.recapitulation_reports where as_of_date = date '2026-04-30';
  if v_id is null then
    raise exception 'Run seed_recapitulation_snapshot() first (the barangay recap for 2026-04-30 must exist).';
  end if;

  select count(*) into v_existing from public.recapitulation_disability_rows where report_id = v_id;
  if v_existing > 0 then return v_id; end if;

  insert into public.recapitulation_disability_rows (
    report_id, disability_type, female_0_17, male_0_17, female_18_30, male_18_30,
    female_31_59, male_31_59, female_60_above, male_60_above, sort_order
  )
  select v_id, t, f017, m017, f1830, m1830, f3159, m3159, f60, m60, ord
  from (values
    ('Cancer (RA 11215)',              4,   2,  12,   6, 204,  30,  46,  11,  1),
    ('Deaf or Hard of Hearing',       16,  14,  30,  33, 104,  80,  21,  12,  2),
    ('Intellectual Disability',       47,  97,  43,  89,  58,  56,   4,   4,  3),
    ('Learning Disability',           14,  34,   7,   3,   3,   3,   1,   1,  4),
    ('Mental Disability',              2,   8,  32,  26,  43,  40,   8,  10,  5),
    ('Physical Disability',           65,  72, 138, 103, 675, 784, 214, 267,  6),
    ('Psychosocial Disability',      155, 237, 293, 231, 982, 858, 248, 220,  7),
    ('Rare Disease (RA 10747)',       17,  19,  16,   8,  45,  21,   1,   0,  8),
    ('Speech & Language Impairment',  39,  76,  24,  36,  48,  70,  14,  12,  9),
    ('Visual Disability',             32,  34,  66,  62, 179, 192,  76,  47, 10)
  ) as t(t, f017, m017, f1830, m1830, f3159, m3159, f60, m60, ord);

  select sum(total) into v_grand from public.recapitulation_disability_rows where report_id = v_id;
  if v_grand <> 7934 then
    raise exception 'Disability data seed total is wrong: % (expected 7934)', v_grand;
  end if;

  return v_id;
end;
$$;
grant execute on function public.seed_recapitulation_disability_data() to anon, authenticated;

select public.seed_recapitulation_disability_data();

-- Assistance requests get their own "reason" and "requirements needed" fields, and uploaded
-- files (PWD ID photos, supporting documents) are finally stored.
--
-- Before: the upload boxes in the registration, profile and request forms never sent the file
-- anywhere, so staff had nothing to look at. The reason for a request was appended to its
-- description.
--
-- After:
--  * assistance_requests.reason              — written by the PWD, shown separately.
--  * assistance_requests.requirements_needed — written by staff: what the PWD still has to bring.
--  * assistance_requests.documents           — [{name, path}] of files in the `documents` bucket.
--  * pwd_users.id_front / id_back            — paths of the PWD ID photos in the same bucket.
--  * A private `documents` bucket. Every file lives under a folder named after the PWD record id;
--    a PWD may read and add files in their own folder, active staff may read everything. Files
--    are opened through short-lived signed URLs, never public links.

alter table public.assistance_requests add column if not exists reason text;
alter table public.assistance_requests add column if not exists requirements_needed text;
alter table public.assistance_requests add column if not exists documents jsonb default '[]'::jsonb;
alter table public.pwd_users add column if not exists id_front text;
alter table public.pwd_users add column if not exists id_back text;

-- ── Column guards: what a PWD may change on their own rows ────────
drop trigger if exists pwd_users_guard on public.pwd_users;
create trigger pwd_users_guard before update on public.pwd_users for each row
  execute function public.guard_columns(
    'name', 'address', 'barangay', 'contact', 'email', 'avatar', 'skills', 'education_level', 'education',
    'work_experience', 'years_of_experience', 'certifications', 'job_interests', 'preferred_job_types',
    'preferred_work_setup', 'preferred_location', 'functional_capabilities', 'accessibility_needs',
    'accommodation_requirements', 'saved_job_ids', 'id_front', 'id_back');

drop trigger if exists assistance_requests_guard on public.assistance_requests;
create trigger assistance_requests_guard before update on public.assistance_requests for each row
  execute function public.guard_columns('pwd_name', 'documents', 'last_updated');

-- ── Adding documents to a request that was already filed ──────────
-- A PWD saves with upsert, and the insert policy only accepts Pending requests, so a request
-- that staff already moved on (e.g. to "Requirements Needed") is updated through this instead.
create or replace function public.add_request_documents(p_request_id text, p_documents jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner text;
  v_doc jsonb;
begin
  select pwd_id into v_owner from public.assistance_requests where id = p_request_id;
  if v_owner is null or v_owner is distinct from public.current_pwd_id() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_documents) is distinct from 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'No documents given';
  end if;
  -- Only files from the caller's own folder can be attached.
  for v_doc in select * from jsonb_array_elements(p_documents) loop
    if coalesce(v_doc ->> 'name', '') = '' or coalesce(v_doc ->> 'path', '') not like v_owner || '/%' then
      raise exception 'Invalid document';
    end if;
  end loop;
  update public.assistance_requests
     set documents = coalesce(documents, '[]'::jsonb) || p_documents,
         last_updated = to_char(now() at time zone 'Asia/Manila', 'YYYY-MM-DD')
   where id = p_request_id;
end;
$$;
revoke all on function public.add_request_documents(text, jsonb) from public, anon;
grant execute on function public.add_request_documents(text, jsonb) to authenticated;

-- ── Storage ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists documents_read on storage.objects;
drop policy if exists documents_insert on storage.objects;
create policy documents_read on storage.objects for select
  using (bucket_id = 'documents' and (public.is_staff() or (storage.foldername(name))[1] = public.current_pwd_id()));
create policy documents_insert on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_pwd_id());

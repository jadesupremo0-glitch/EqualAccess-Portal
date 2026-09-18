-- Password reset verification codes (sent via SMTP email)
create table public.password_resets (
  id bigint generated always as identity primary key,
  user_kind text not null check (user_kind in ('pwd', 'admin')),
  user_id text not null,
  purpose text default 'password_reset',
  code text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used boolean default false,
  created_at timestamptz default now()
);

create index password_resets_owner_idx on public.password_resets (user_kind, user_id, purpose);

alter table public.password_resets enable row level security;

create policy "password_resets_all" on public.password_resets for all using (true) with check (true);
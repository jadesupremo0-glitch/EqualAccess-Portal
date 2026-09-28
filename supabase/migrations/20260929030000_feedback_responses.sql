-- Feedback replies and internal notes get their own table.
--
-- They used to be a JSON array on the ticket row, so a PWD who could read their ticket could
-- also read the staff's internal notes on it (only the screen hid them), and could rewrite the
-- whole reply history when saving the ticket. One row per reply lets Row Level Security hide
-- internal notes per row and makes the history append-only for PWDs.

create table public.feedback_responses (
  id bigint generated always as identity primary key,  -- also the display order
  ticket_id text not null references public.feedback_tickets(id) on delete cascade,
  author text not null default '',
  date text not null default '',
  message text not null default '',
  is_internal boolean not null default false,
  from_user boolean not null default false,             -- written by the ticket's owner
  created_at timestamptz not null default now()
);
create index feedback_responses_ticket_idx on public.feedback_responses (ticket_id, id);

-- Carry the existing replies over, in their original order. Older owner replies used the author "You".
insert into public.feedback_responses (ticket_id, author, date, message, is_internal, from_user)
select t.id,
       coalesce(r.value ->> 'author', ''),
       coalesce(r.value ->> 'date', ''),
       coalesce(r.value ->> 'message', ''),
       coalesce((r.value ->> 'isInternal')::boolean, false),
       coalesce((r.value ->> 'fromUser')::boolean, false) or r.value ->> 'author' = 'You'
from public.feedback_tickets t
cross join lateral jsonb_array_elements(coalesce(t.responses, '[]'::jsonb)) with ordinality as r(value, n)
order by t.id, r.n;

alter table public.feedback_tickets drop column responses;

-- A PWD's reply is always a plain reply under their ticket's display name, whatever the client sends.
create or replace function public.feedback_response_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.is_internal := false;
    new.from_user := true;
    select case when coalesce(t.is_anonymous, false) then 'Anonymous User' else t.pwd_name end
      into new.author
      from public.feedback_tickets t where t.id = new.ticket_id;
  end if;
  return new;
end;
$$;
create trigger feedback_responses_defaults before insert on public.feedback_responses
  for each row execute function public.feedback_response_defaults();

alter table public.feedback_responses enable row level security;

-- Staff read everything; a PWD reads only the non-internal replies on their own tickets.
create policy responses_read on public.feedback_responses for select using (
  public.is_staff()
  or (not is_internal and exists (
    select 1 from public.feedback_tickets t where t.id = ticket_id and t.user_id = public.current_pwd_id()))
);
-- Append-only: no update or delete policies, so nobody can rewrite the history from the app.
create policy responses_insert on public.feedback_responses for insert with check (
  public.is_staff()
  or exists (select 1 from public.feedback_tickets t where t.id = ticket_id and t.user_id = public.current_pwd_id())
);

-- The ticket itself: a PWD may still rename it (profile name change) and set its status by replying.
drop trigger feedback_tickets_guard on public.feedback_tickets;
create trigger feedback_tickets_guard before update on public.feedback_tickets for each row
  execute function public.guard_columns('pwd_name', 'status');

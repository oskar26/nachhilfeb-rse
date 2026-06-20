-- add_messages.sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.ad_requests(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  is_deleted boolean default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

drop policy if exists "Chat participants can view messages" on public.messages;
create policy "Chat participants can view messages" on public.messages for select using (
  exists (
    select 1 from public.ad_requests r 
    where r.id = request_id 
    and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
  )
);

drop policy if exists "Chat participants can insert messages" on public.messages;
create policy "Chat participants can insert messages" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (
    select 1 from public.ad_requests r 
    where r.id = request_id 
    and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
    and r.status = 'accepted'
  )
);

drop policy if exists "Sender can update messages" on public.messages;
create policy "Sender can update messages" on public.messages for update using (
  sender_id = auth.uid()
);

drop policy if exists "Receiver can mark as read" on public.messages;
create policy "Receiver can mark as read" on public.messages for update using (
  exists (
    select 1 from public.ad_requests r 
    where r.id = request_id 
    and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
    and auth.uid() != sender_id
  )
);

drop policy if exists "SV Admin can view all messages" on public.messages;
create policy "SV Admin can view all messages" on public.messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- Realtime needs to be enabled for the messages table
alter publication supabase_realtime add table public.messages;

notify pgrst, 'reload schema';

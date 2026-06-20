-- fix_favorites.sql
-- Ensure RLS on favorites allows insert
alter table public.favorites enable row level security;
drop policy if exists "Own favorites" on public.favorites;
create policy "Own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Also add policy for viewing public favorites just in case
drop policy if exists "Public view favorites" on public.favorites;
create policy "Public view favorites" on public.favorites for select using (true);

-- Notify postgrest
notify pgrst, 'reload schema';

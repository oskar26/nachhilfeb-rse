-- fix_ratings.sql
-- Ensure RLS on reviews allows insert
alter table public.reviews enable row level security;
drop policy if exists "Authors create reviews" on public.reviews;
create policy "Authors create reviews" on public.reviews for insert with check (auth.uid() = author_id);

-- Update profile rating function
create or replace function update_user_rating()
returns trigger as $$
begin
  update public.profiles
  set average_rating = (
    select coalesce(avg(rating), 0)
    from public.reviews
    where target_user_id = coalesce(new.target_user_id, old.target_user_id)
  )
  where id = coalesce(new.target_user_id, old.target_user_id);
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_changed on public.reviews;
create trigger on_review_changed
  after insert or update or delete on public.reviews
  for each row execute procedure update_user_rating();

notify pgrst, 'reload schema';

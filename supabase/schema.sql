-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: public.profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  full_name text, -- computed or redundant, but useful for search
  display_name text,
  
  grade_level text,
  class_letter text,
  
  role text default 'student' check (role in ('student', 'sv_admin')),
  subjects text[] default '{}',
  
  bio text,
  
  -- Contact Info
  moodle_name text,
  phone_number text,
  email text,
  contact_other text,
  
  -- Settings / Privacy
  settings jsonb default '{"email_visible": false, "phone_visible": false}'::jsonb,
  
  avatar_url text,
  is_verified boolean default false,
  
  -- Stats
  average_rating float default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.ads
create table if not exists public.ads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('offer', 'search')),
  subjects text[] not null default '{}',
  grade_levels text[] not null default '{}',
  locations text[] not null default '{}',
  custom_location text,
  
  price_details jsonb default '{}'::jsonb,
  duration_minutes int[] default '{}',
  
  short_description text,
  long_description text,
  image_urls text[] default '{}',
  
  is_active boolean default true, -- Used for soft delete or turning off
  is_archived boolean default false, -- Hard archive by admin or user
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.ad_requests (The Interaction Flow)
create table if not exists public.ad_requests (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public.ads(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null, -- Denormalized for easier RLS
  
  role text check (role in ('student_to_tutor', 'tutor_to_student')), -- Context
  message text,
  
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'completed')),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.reviews
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public.ads(id) on delete set null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  target_user_id uuid references public.profiles(id) on delete cascade not null,
  
  rating float check (rating >= 0 and rating <= 5),
  comment text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.favorites
create table if not exists public.favorites (
  user_id uuid references public.profiles(id) on delete cascade not null,
  ad_id uuid references public.ads(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, ad_id)
);


-- TRIGGER: Create Profile on Signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_name text;
  derived_name text;
begin
  raw_name := new.raw_user_meta_data->>'full_name';
  if raw_name is null or raw_name = '' then
    derived_name := split_part(new.email, '@', 1);
  else
    derived_name := raw_name;
  end if;

  insert into public.profiles (id, full_name, display_name, email)
  values (new.id, derived_name, derived_name, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECRET CODES & PROFILE PROTECTION
create or replace function public.redeem_code(secret_code text)
returns boolean as $$
begin
  if secret_code = 'SV_FWG_ADMIN_2026' then
    perform set_config('app.bypass_rls', 'true', true);
    update public.profiles set role = 'sv_admin', is_verified = true where id = auth.uid();
    return true;
  elsif secret_code = 'VERIFY_ME_NOW' then
    perform set_config('app.bypass_rls', 'true', true);
    update public.profiles set is_verified = true where id = auth.uid();
    return true;
  end if;
  return false;
end;
$$ language plpgsql security definer;

create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  -- Allow if bypassing via redeem_code
  if current_setting('app.bypass_rls', true) = 'true' then
     return new;
  end if;

  -- Allow if the executor is an sv_admin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin') then
     return new;
  end if;

  -- Otherwise prevent role and is_verified changes
  if new.role is distinct from old.role then
     new.role = old.role;
  end if;

  if new.is_verified is distinct from old.is_verified then
     new.is_verified = old.is_verified;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists ensure_profile_protection on public.profiles;
create trigger ensure_profile_protection
  before update on public.profiles
  for each row execute procedure public.protect_profile_fields();


-- RLS --
alter table public.profiles enable row level security;
alter table public.ads enable row level security;
alter table public.ad_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

-- PROFILES
drop policy if exists "Public profiles" on public.profiles;
create policy "Public profiles" on public.profiles for select using (auth.role() = 'authenticated');

drop policy if exists "Self update" on public.profiles;
create policy "Self update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Self insert" on public.profiles;
create policy "Self insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Admin update" on public.profiles;
create policy "Admin update" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- ADS
drop policy if exists "Public ads" on public.ads;
create policy "Public ads" on public.ads for select using (true);

drop policy if exists "Self ad management" on public.ads;
create policy "Self ad management" on public.ads for all using (auth.uid() = user_id);

drop policy if exists "Admin ad management" on public.ads;
create policy "Admin ad management" on public.ads for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- REQUESTS
drop policy if exists "View own requests" on public.ad_requests;
create policy "View own requests" on public.ad_requests for select using (
  auth.uid() = requester_id or auth.uid() = owner_id
);

drop policy if exists "Create requests" on public.ad_requests;
create policy "Create requests" on public.ad_requests for insert with check (
  auth.uid() = requester_id
);

drop policy if exists "Update own requests" on public.ad_requests;
create policy "Update own requests" on public.ad_requests for update using (
  auth.uid() = requester_id or auth.uid() = owner_id
);

-- REVIEWS
drop policy if exists "Public reviews" on public.reviews;
create policy "Public reviews" on public.reviews for select using (true);

drop policy if exists "Authors create reviews" on public.reviews;
create policy "Authors create reviews" on public.reviews for insert with check (auth.uid() = author_id);

drop policy if exists "Admin manage reviews" on public.reviews;
create policy "Admin manage reviews" on public.reviews for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

-- FAVORITES
drop policy if exists "Own favorites" on public.favorites;
create policy "Own favorites" on public.favorites for all using (auth.uid() = user_id);

-- ENHANCEMENTS: Moderation & Admin
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.ads add column if not exists is_hidden boolean default false;

-- Table: public.reports
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reported_ad_id uuid references public.ads(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  
  reason text not null,
  description text,
  status text default 'open' check (status in ('open', 'resolved', 'dismissed')),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

drop policy if exists "Users can insert reports" on public.reports;
create policy "Users can insert reports" on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Admins can view reports" on public.reports;
create policy "Admins can view reports" on public.reports for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'sv_admin')
);

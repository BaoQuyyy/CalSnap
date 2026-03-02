-- ============================================================
-- CalSnap Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  daily_calorie_goal int not null default 2000,
  created_at timestamp with time zone default now()
);

-- Meal logs table
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  food_name text not null,
  calories int not null,
  protein float not null,
  carbs float not null,
  fat float not null,
  image_url text,
  logged_at date not null default current_date,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.meal_logs enable row level security;

-- Profiles: users can only read/write their own row
create policy "Users can manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Meal logs: users can only read/write their own rows
create policy "Users can manage their own meals"
  on public.meal_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile row when a user signs up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

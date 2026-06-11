-- 0003_profiles_trial_delivery.sql — trial signup + per-user delivery day
-- Run in: Supabase Dashboard -> SQL Editor. Idempotent.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- JS Date.getDay() convention: 0=Sunday .. 6=Saturday
  delivery_day smallint not null default 1 check (delivery_day between 0 and 6),
  trial_ends_at timestamptz,
  welcomed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read and update their own profile (delivery day changes from the
-- account page). trial_ends_at manipulation is prevented by column-level
-- restraint in the app (server routes use the service key anyway); RLS here
-- guards reads/writes to own row only.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

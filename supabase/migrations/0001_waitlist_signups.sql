-- 0001_waitlist_signups.sql — M1 email capture
-- How to run: Supabase Dashboard -> SQL Editor -> paste this file -> Run.
-- (No Supabase CLI on this machine yet; migrations are tracked here in-repo.)

create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

-- No RLS policies on purpose: the publishable (anon) key gets NO access at all.
-- Only the server-side route writes, using the secret key, which bypasses RLS.

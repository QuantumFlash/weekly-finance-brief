-- 0002_core_schema.sql — M2 (billing) + M3 (issues/pipeline) + M4 (ops) tables
-- Run AFTER 0001. How: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.

-- ============ M2: billing ============

-- Local mirror of Stripe state. Source of truth is Stripe; this is synced
-- on-demand (account page, post-checkout) and by webhook once deployed publicly.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text not null default 'none',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only log of every subscription lifecycle event we observe.
create table if not exists public.subscription_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ M3: issues & delivery ============

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  week_label text not null unique,
  subject text not null,
  body_markdown text not null,
  body_html text not null,
  body_text text not null,
  model text not null,
  status text not null default 'draft', -- draft | needs_review | sent
  generated_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.deliveries (
  id bigint generated always as identity primary key,
  issue_id uuid not null references public.issues(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null, -- sent | failed
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (issue_id, email)
);

-- Small metadata only (titles/urls/dates) — never full source content.
create table if not exists public.source_snapshots (
  id bigint generated always as identity primary key,
  issue_id uuid not null references public.issues(id) on delete cascade,
  kind text not null, -- official | headline | indicator
  ref_id text not null,
  title text not null,
  source text not null,
  url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ M4: ops ============

create table if not exists public.pipeline_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | success | failed | needs_review
  issue_id uuid references public.issues(id) on delete set null,
  detail text
);

-- ============ RLS ============
-- Enabled everywhere. The server-side secret key bypasses RLS; the browser
-- (publishable key) gets only the minimal read access the product needs.

alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.issues enable row level security;
alter table public.deliveries enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.pipeline_runs enable row level security;

-- Users can read their own subscription row (account page).
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Sent issues are public content (the web archive).
drop policy if exists "read sent issues" on public.issues;
create policy "read sent issues" on public.issues
  for select using (status = 'sent');

-- Everything else: no policies on purpose = no client access at all.

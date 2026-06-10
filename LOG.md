# LOG — Weekly Finance Brief

Running log: date, what changed, what's next. Newest first.

## 2026-06-10 — Session 3: Full autonomous build — M2, M3, M4 + launch

**Done (commits 023d57e → bdd92ec + this one):**
- M2: Supabase magic-link auth (login/callback/signout), account page, Stripe billing — self-bootstrapping $5/mo price, checkout + portal routes, signature-verified webhook (future deploy), webhook-INDEPENDENT on-demand sync (Stripe = source of truth, local mirror non-fatal)
- M3: lib/claude.ts built per /claude-api skill — fable-5 high effort + adaptive thinking (capabilities verified via Models API: effort all-levels, thinking adaptive-only), streaming finalMessage, cached system prompt, refusal/truncation fallback to opus-4-8, needs_review on double failure; allowlisted collectors (FRED ×5, Fed RSS ×3 — BLS dropped, 404s); strict-contract parser + dependency-free HTML/text renderer; full pipeline script with pipeline_runs logging + admin alerts; /issues archive + /issues/[week]
- M4: /admin ops dashboard (ADMIN_EMAIL-gated, 404-concealed), failure alert emails, 0002 core schema migration
- Launch: scheduled task WeeklyFinanceBrief-Pipeline (Mon 07:00, StartWhenAvailable+WakeToRun), web auto-start via Startup folder (logon-trigger tasks need admin), production server live on :3000
- Security pass (manual; skill needs origin remote): FIXED open redirect in /auth/callback ?next=; verified secret/import-graph, RLS, webhook sig, HTML escaping, no-PII logs
- **E2E verified via Playwright + Gmail: landing → login → magic link (PKCE) → /account → Stripe sandbox checkout (4242 test card, AI-agent disclosure attempted — Stripe renders it offscreen) → status `active`, period end 10 Jul 2026, Manage-billing CTA.** Stripe customer + subscription live in test mode.
- Source validation: 3 Fed feeds 200 OK; FRED key OK (SP500 7386.65 @ 2026-06-09); BLS dead under known paths
- claude-fable-5 confirmed real + live (released 2026-06-07); opus-4-8 = current bare Opus alias; config pinned to verified IDs

**Blocked on one manual step:** migrations 0001+0002 (Supabase dashboard session needed — Chrome extension stayed disconnected all session; no CLI token on machine; sb_secret can't run DDL). Then: /account revisit → brief:dry → brief:weekly.

**Next session:** apply migrations → pipeline e2e (first real issue!) → consider key rotation pass → /reflect on M1-M4 → public deploy planning (runbook in CLAUDE.md).

## 2026-06-10 — Session 2: M1 build (landing + email capture)

**Done:**
- Supabase keys (new `sb_publishable_`/`sb_secret_` format) into `.env.local`; generated `CRON_SECRET` locally
- `npm install` (359 pkgs); Next.js is **16.2.9** — past Claude's training data; bundled docs folder from AGENTS.md doesn't actually ship, so conventions were verified against the scaffold code + installed `.d.ts` types (route handlers + `NextResponse.json` confirmed unchanged)
- Landing page (`src/app/page.tsx`): what/who/single CTA, compliance footer; `src/components/WaitlistForm.tsx` (client form, idle/submitting/success/error)
- `src/app/api/waitlist/route.ts`: validation, PostgREST insert with secret key, duplicate-silent (no email enumeration), PII-free logging, graceful 503 when unconfigured
- `supabase/migrations/0001_waitlist_signups.sql`: table + RLS enabled with zero policies (server-only writes)
- Layout metadata for the product
- `npm run build` ✓ clean (routes: `/` static, `/api/waitlist` dynamic)

**Next:** Archi runs migration SQL in dashboard → `/run` + `/verify` capture flow → M2. Suggested: `/code-review` on this change set; `/security-review` once M2 auth/billing code starts.

## 2026-06-10 — Session 1: Bootstrap

**Done:**
- Scaffolded Next.js (TS, Tailwind, App Router, `src/`) via create-next-app `--skip-install` into `tools/weekly-finance-brief/`
- Created project memory: `CLAUDE.md` (spec, stack, model routing, roadmap M1–M4), `WEEKLY-FINANCE-BRIEF.md` (status), `LOG.md`
- `.env.local` with provided keys (gitignored, verified untracked before commit) + `.env.example` template (committed, with `!.env.example` gitignore exception)
- `prompts/fable-summariser.md` v1.0.0 — stable, cache-friendly system prompt with strict I/O contract, self-check steps, no-advice rules, prompt-injection guard
- `config/models.ts` (routing: Fable 5 brief / cheaper interactive / fallback), `lib/env.ts` (lazy required-env access), `scripts/generateWeeklyBrief.ts` (typed pipeline skeleton, stages stubbed)
- Initial git commit

**Notes / risks:**
- ⚠ API keys were pasted into the chat transcript during goal setup → recommended rotating Resend (+ FRED/AlphaVantage)
- Template warns this Next.js version differs from Claude's training data → must read bundled docs after `npm install`, before any `src/` work
- Missing keys block parts of M1–M3: Supabase anon/service, Stripe publishable/webhook, Anthropic

**Next:** see `WEEKLY-FINANCE-BRIEF.md` snapshot.

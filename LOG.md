# LOG — Weekly Finance Brief

Running log: date, what changed, what's next. Newest first.

## 2026-06-11 — Session 4: M5 — modern UI, free trial, per-day delivery

**Done:**
- Migration 0003 `profiles` (delivery_day 0-6, trial_ends_at, welcomed_at; RLS read/update own) — applied via still-live dashboard session
- Trial signup: `/api/signup` (find-or-create user, 7-day card-less trial never reset on re-signup, no email enumeration) + branded welcome email; `/api/profile/day` (RLS-scoped update + legacy-account fallback insert)
- Pipeline → DAILY 07:00: issue generated once per ISO week (published immediately), delivered per-user on their chosen day; idempotent (already-delivered skip); scheduler re-registered
- UI overhaul: dark/emerald design system — SiteHeader/SiteFooter, hero w/ product mock, about-us, how-it-works, day-picker SignupForm (#signup), restyled login/account (trial banner, day selector)/archive/issue pages; WaitlistForm removed (route kept)
- E2E: UI signup (+trial alias, Friday) → profile day=5, trial +7d exactly ✓; owner signup → welcome email DELIVERED ✓
- **Deliverability bisection (3 rounds of A/B probes):** plain emails deliver in seconds; emails embedding the Supabase auth action_link are silently dropped; phish-pattern SUBJECTS ("sign-in link", "free week starts now") also dropped even with clean bodies. Fixes: welcome email carries no auth link (points to /login; Supabase's own sender handles magic links — proven deliverable) + informational subjects. Copy bug fixed: returning-vs-new keys off user, not profile.
- Cleanup: +trial test user deleted (cascades profile); screenshots in repo (docs-assets-*.png)

**Next:** Friday/Monday automated runs exercise per-day delivery in production; domain verification remains the unlock for non-owner recipients.

## 2026-06-10 — Session 3 (coda): Gemini primary live, retry ladder, sent-immutability bug fixed

- Archi's Gemini key verified (new `AQ.` key format — probe beats priors); /v1beta/models listed the full 2026 lineup → pinned **gemini-3.5-flash** (newest stable flash)
- First Gemini run 503'd ("high demand") and fell straight to the subscription CLI → added **retry ladder** (2 attempts/model, 20s backoff, then gemini-2.5-flash; fatal-abort only on 401/403). Proven live: 503 → backoff → success, CLI untouched, $0.
- **Bug found & fixed:** post-send dry run downgraded the sent W24 issue to draft → archive 404 while the delivered email linked to it. Fix: sent issues are now immutable to the pipeline (early no-op before generation + race guard in storeIssue); W24 restored to `sent` with original sent_at (body is now the Gemini regeneration — the emailed copy was the Opus version; same facts, accepted drift, can't recur post-fix).
- Cost state: weekly runs on Gemini free tier; the Claude account is touched only if the whole Gemini ladder fails (set `BRIEF_FALLBACK_CLI=off` to forbid even that).
- Note: Gemini key transited chat — revocable/regenerable at aistudio.google.com/apikey anytime.

## 2026-06-10 — Session 3 (finale): migrations applied, backend made free, ISSUE #1 SHIPPED

- Migrations applied via Supabase dashboard (Archi logged into the automation browser; SQL injected via Monaco API; destructive-op dialog confirmed) → all 7 tables verified over REST
- Waitlist e2e ✓ (row written); subscription mirror row written on /account revisit (status active)
- First dry run failed at generation: Anthropic API credit balance $0 (error logging fixed to surface real messages — was masked as bare 400). Failure path worked perfectly: needs_review, run logged, ops alert email delivered.
- **Product decision (Archi): fully free** → swapped generation backend from metered API to Claude Code CLI on the existing subscription (jarvis pattern): lib/claude.ts rewritten (stdin prompt, JSON output, ANTHROPIC_API_KEY stripped from child env), models = opus/sonnet CLI aliases (opus-4-6 + sonnet-4-6 verified on plan), parseBrief hardened against preambles. SDK implementation preserved in git history (1527b1d) for the commercial switch-back.
- `brief:dry` ✓ (opus, 3843 chars, parsed, stored draft) — content quality: every figure traced to [I-refs], no advice, glossary apt
- `brief:weekly` ✓ — **issue 2026-W24 sent 1/1, delivered to inbox 13:57Z, live at /issues/2026-W24, archive list updated**
- Total running cost: $0/month. Remaining nits: rotate Resend key; delete unused Anthropic API key; DEP0190 cosmetic warning on spawn.

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

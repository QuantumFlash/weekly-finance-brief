# LOG — Weekly Finance Brief

Running log: date, what changed, what's next. Newest first.

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

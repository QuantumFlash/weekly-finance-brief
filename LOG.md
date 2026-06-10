# LOG — Weekly Finance Brief

Running log: date, what changed, what's next. Newest first.

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

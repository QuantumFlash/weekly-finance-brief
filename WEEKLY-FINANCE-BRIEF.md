# Weekly Finance Brief — Status

**Updated:** 2026-06-10 (Session 3 — full build + launch)
**Current milestone:** LAUNCHED (local-first) — one manual step outstanding
**State:** All four milestones built and committed. Site live at `http://localhost:3000` (production build, auto-start at logon). **M2 verified end-to-end with a real test subscription: magic-link login → Stripe checkout → status `active`.** Weekly pipeline scheduled (Mondays 07:00). `claude-fable-5` verified live on the account; all 3 Fed feeds + FRED verified.

## The one outstanding step

**Apply the two migrations** (needs your Supabase dashboard session — nothing else is blocked):
Open the [SQL Editor](https://supabase.com/dashboard/project/nzszyzjnbzalhtmakbqg/sql/new), paste `supabase/migrations/0001_waitlist_signups.sql` then `0002_core_schema.sql`, Run each. (Or reconnect the Claude Chrome extension and Claudian does it.)

Until then: waitlist signups return a friendly error, the subscription mirror/issue storage/ops tables are offline — but auth, billing, and all pages work (verified).

## After migrations (Claudian runs these on request, or Monday's task does it automatically)

1. Re-visit `/account` once (writes the subscription mirror row).
2. `npm run brief:dry` — full pipeline rehearsal, issue stored as draft.
3. `npm run brief:weekly` — real run: generates with fable-5, emails the brief, publishes to `/issues`.

## Standing items

- Rotation pass for keys that transited chat: Resend (priority), Anthropic, Supabase `sb_` pair, FRED/AlphaVantage. Stripe = test mode.
- Resend sandbox only delivers to abeckfriis2002@gmail.com until a domain is verified — fine while you're the only subscriber.
- 2 moderate `npm audit` findings in scaffold deps — review later, don't `--force`.
- Public-deploy checklist lives in CLAUDE.md → Runbook.

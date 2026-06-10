# Weekly Finance Brief — Status

**Updated:** 2026-06-10 (Session 2 — M1 build)
**Current milestone:** M1 — Landing page + email capture
**State:** M1 code complete and building cleanly (Next 16.2.9). Landing page with single CTA, `/api/waitlist` capture route (PostgREST + secret key, RLS locked), migration SQL written. Supabase keys are in. **Not yet live:** the table doesn't exist in Supabase until the migration runs.

## Next 3 tasks

1. **Archi:** open [Supabase SQL Editor](https://supabase.com/dashboard/project/nzszyzjnbzalhtmakbqg/sql/new), paste `supabase/migrations/0001_waitlist_signups.sql`, Run.
2. `/run` the dev server, submit a test email, `/verify` the flow (row lands in `waitlist_signups`, duplicate submit still reports success).
3. Kick off M2: Supabase magic-link auth + account page. (Needs `STRIPE_PUBLISHABLE_KEY` + webhook secret only when checkout work starts.)

## Standing items

- All keys now in except `STRIPE_WEBHOOK_SECRET` (created during M2 webhook setup — nothing to fetch).
- Anthropic key **validated** 2026-06-10; `claude-fable-5` + `claude-opus-4-8` confirmed live via `/v1/models`; routing config updated with verified IDs.
- Rotation pass (keys transited chat): Resend (priority), Anthropic, Supabase `sb_` pair, FRED/AlphaVantage. Stripe = test mode, skip.
- 2 moderate `npm audit` findings in scaffold deps — review at M4, don't `--force` fix.

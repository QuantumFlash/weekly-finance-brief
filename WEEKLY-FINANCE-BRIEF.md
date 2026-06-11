# Weekly Finance Brief — Status

**Updated:** 2026-06-11 (Session 7 — diagnostic, polished email, fully live)
**Current milestone:** 🟢 **LIVE & SELF-RUNNING** at https://weeklyfinancebrief.com

## State

A complete, deployed, monetised micro-SaaS taking real EUR payments and running itself:
- **Site:** Vercel, custom domain + SSL, all pages verified.
- **Payments:** LIVE France/EUR Stripe account (`acct_1Th4vlGYylhw9dQu`), €5/mo, 7-day card-gated trial, live webhook.
- **Email:** verified domain `brief@weeklyfinancebrief.com`, polished branded template (table-based, header, sections, footer, unsubscribe).
- **Pipeline:** Gemini free tier (ladder → CLI off in CI), one issue/ISO week, per-day delivery. **Hosted GitHub Actions cron, 05:00 UTC daily (07:00 French)** — scheduled run verified firing on its own. Local Windows task disabled (single canonical runner).
- **Cost to run:** ~€0/month + the domain.

## Full diagnostic 2026-06-11 — all green

Site (7 pages), DNS (A/DKIM/SPF/MX/DMARC), live Stripe (charges+payouts on, webhook, €5 price), Supabase (8 tables), email deliverability, Gemini (fallback when primary busy), GitHub cron (scheduled success), 19/19 Vercel env vars. Cleaned 1 stale subscription mirror.

## Nothing blocks real customers. Optional polish (all yours):

- **Stripe public name** still says "…sandbox" — Stripe → Settings → Business → public details.
- **Consolidate Stripe accounts** — you have 3 (JP abandoned, FR-test, FR-live). Send me FR-LIVE *test* keys to make local match prod, then close the other two.
- Optional clean Resend re-rotation (send-only key in transcript) — needs one `gh` 2FA.

## First real subscriber

When someone signs up + completes checkout, they're a paying customer; they receive the polished brief on their chosen day. The public archive refreshes with a new issue every week automatically regardless of subscribers.

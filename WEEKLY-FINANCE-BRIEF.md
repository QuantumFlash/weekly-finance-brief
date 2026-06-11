# Weekly Finance Brief — Status

**Updated:** 2026-06-11 (Session 5 — DEPLOYED)
**Current milestone:** 🌍 LIVE IN PRODUCTION — fully hosted, runs without the local machine
**Live site:** https://weekly-finance-brief.vercel.app

## What's live and verified

- **Site:** Vercel, auto-deploys on `git push` (repo `QuantumFlash/weekly-finance-brief`). All pages 200.
- **Signup → trial:** card-gated Stripe checkout (7-day trial, $0 today, first-timers only). **Production signup verified live** — returns real checkout URL.
- **Hosted cron:** GitHub Actions daily 07:00 CET on Node 22 — verified green. No machine dependency.
- **Stripe webhook:** registered, keeps subscription state in sync.
- **Generation:** Gemini free tier (retry ladder), $0, off the owner's Claude account.
- **Market-ready extras:** rate limiting, one-click unsubscribe, Terms + Privacy pages.

## The 2 things that still need YOU (business, not code)

1. **Verify a Resend domain** (resend.com/domains) → then update `EMAIL_FROM` in Vercel + GitHub secret. **Until then, emails only reach you (the owner).** This is the single growth blocker — without it, new subscribers get no emails.
2. **Switch Stripe to live keys** when ready for real money (currently test mode — checkout works but charges aren't real). Swap keys in Vercel, register a live webhook.

## Nice-to-have later

- Rotate keys that transited chat (Resend/Gemini/Supabase).
- Node 20 deprecation warning on the GitHub Actions wrapper actions (cosmetic; bump checkout/setup-node to v4-latest before Sept 2026).
- 2 moderate `npm audit` findings in scaffold deps.

## Economics

$0/month to run (Vercel Hobby, GitHub Actions, Supabase/Gemini/FRED free tiers, Resend free). Revenue: $5/mo Stripe subscription after 7-day trial.

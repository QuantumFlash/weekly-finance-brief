# Weekly Finance Brief — Status

**Updated:** 2026-06-11 (Session 5 — apex live, keys rotated)
**Current milestone:** 🌍 LIVE IN PRODUCTION on the real domain
**Live site:** https://weeklyfinancebrief.com (Vercel; `weekly-finance-brief.vercel.app` still aliases)

## What's live and verified

- **Site:** Vercel, auto-deploys on `git push` (repo `QuantumFlash/weekly-finance-brief`). All pages 200.
- **Signup → trial:** card-gated Stripe checkout (7-day trial, $0 today, first-timers only). **Production signup verified live** — returns real checkout URL.
- **Hosted cron:** GitHub Actions daily 07:00 CET on Node 22 — verified green. No machine dependency.
- **Stripe webhook:** registered, keeps subscription state in sync.
- **Generation:** Gemini free tier (retry ladder), $0, off the owner's Claude account.
- **Market-ready extras:** rate limiting, one-click unsubscribe, Terms + Privacy pages.

## ✅ Domain LIVE: weeklyfinancebrief.com (2026-06-11)

Verified in Resend, `EMAIL_FROM=brief@weeklyfinancebrief.com` everywhere, **stranger-delivery proven** (non-owner inbox ✓). The product can email anyone. Growth blocker eliminated.

## The 1 thing that still needs YOU (business, not code)

**Switch Stripe to live keys** when ready for real money (currently test mode — checkout works but charges aren't real). Swap keys in Vercel, register a live webhook. Until then: fully functional product, fake money.

Token cleanup when convenient: delete the full-access Resend key + Cloudflare DNS token (both transited chat, both done with their jobs). Optional polish: point the apex domain at Vercel so the site lives on weeklyfinancebrief.com.

## Security

Final production audit done 2026-06-11 (money/auth/secrets surface) — **clean, no critical issues**. Service key is server-only, webhook signature-verified, admin properly gated, unsubscribe HMAC-signed, open-redirect guarded. CI bumped to actions v6 (Node 24). Full notes in LOG. Verdict: safe for real customers once Stripe live keys are in.

## Nice-to-have later

- Resend `production-send-v2` key appeared in this transcript during the GitHub-secret step (send-only, bounded risk) — optional clean re-rotation needs a fresh `gh` login (one 2FA).
- Rate limiter is in-memory (per-instance) — fine as defense-in-depth behind card-gating; upgrade to Upstash if abuse appears.
- 2 moderate `npm audit` findings in scaffold deps.

## Economics

$0/month to run (Vercel Hobby, GitHub Actions, Supabase/Gemini/FRED free tiers, Resend free). Revenue: $5/mo Stripe subscription after 7-day trial.

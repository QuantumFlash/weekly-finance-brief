# Weekly Finance Brief — Status

**Updated:** 2026-06-11 (Session 4 — M5.1 shipped)
**Current milestone:** 🚀 LIVE through M5.1 — modern UI, card-gated free trial, per-day delivery
**State:** Dark/emerald redesign live at `http://localhost:3000`. Signup = email + delivery-day picker → **Stripe trial checkout (card required, $0 today, trial only for first-time customers — no trial farming)** → `/welcome` verification → branded welcome email. One issue generated per ISO week (Gemini free tier, retry ladder, CLI emergency fallback), delivered daily at 07:00 to whoever's day it is. All $0/month to run.

## Verified this session

UI signup flow (day picker → profile day=5, trial exactly +7d) · welcome email delivered to inbox · deliverability bisected and fixed (no auth links in app emails; informational subjects) · day-change route with legacy-account fallback · daily scheduler registered · published-issue immutability intact.

## How money works now

Free trial (7 days, no card) → trial banner on /account with days left → $5/mo Stripe checkout (test mode) when ready. Entitled = Stripe active/trialing/past_due OR active trial.

## Standing items (none blocking)

- **Domain verification in Resend** is now THE growth unlock: until then only the owner's address receives mail (welcome + briefs alike) — signups from others record cleanly but their email fails in sandbox.
- Rotation list unchanged: Resend key (priority), Gemini key, Supabase `sb_` pair, FRED/AV; delete unused Anthropic API key.
- 2 moderate `npm audit` findings — review pre-public-deploy.
- Public-deploy checklist: CLAUDE.md → Runbook.

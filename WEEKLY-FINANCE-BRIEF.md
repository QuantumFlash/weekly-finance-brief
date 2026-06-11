# Weekly Finance Brief — Status

**Updated:** 2026-06-10 (Session 3 complete)
**Current milestone:** 🚀 **LAUNCHED & FULLY VERIFIED — nothing outstanding**
**Issue #1 shipped:** `2026-W24 — "Stocks slide 2.2%; yields rise; Fed flags stress tests"` (claude-opus-4-6 via CLI, $0) — delivered to inbox 1/1, live at `/issues/2026-W24`.

## Verified end-to-end (all of it)

Landing → waitlist (DB row) · magic-link auth · Stripe test checkout → `active` · subscription mirror + entitlement · migrations applied (7 tables + RLS) · collect (FRED ×5 + Fed feeds ×3, 0 warnings) · generate (Opus via subscription CLI) · strict-format parse · store · email send (Resend, 1/1) · web archive · pipeline_runs logging · ops failure alert (proven by the credit-balance incident) · weekly scheduler (Mon 07:00) · web auto-start at logon.

## Economics

**$0/month, off the owner's Claude account:** generation = Gemini free tier (`gemini-3.5-flash`, retry ladder, verified live); Claude CLI is emergency-fallback only (`BRIEF_FALLBACK_CLI=off` to forbid entirely). Supabase/Resend/Stripe-test/FRED all free tiers. Revenue path live: $5/mo Stripe subscription (test mode). Switch-to-metered-API path in CLAUDE.md for when external customers arrive.

## Normal week = zero manual work

Monday 07:00: pipeline collects → Opus writes → subscribers emailed → archive updated → run logged. Failures email abeckfriis2002@gmail.com. Ops dashboard: `/admin` (sign in as admin email).

## Standing items (none blocking)

- **Resend key rotation** still recommended (live key, transited chat). The Anthropic API key is now *unused* — simplest is to delete it in the console.
- When ready for real customers: CLAUDE.md → Runbook → public-deploy checklist (hosting, live Stripe, verified send domain, webhook, metered API).
- Minor wart: Node DEP0190 warning on CLI spawn (cosmetic; fixed by spawning claude.cmd path directly without shell).

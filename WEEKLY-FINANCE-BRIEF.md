# Weekly Finance Brief — Status

**Updated:** 2026-06-10 (Session 1 — bootstrap)
**Current milestone:** M1 — Landing page + email capture
**State:** Repo scaffolded (Next.js + TS, deps not yet installed). Notes, env, prompt v1, model config in place. No app code written yet.

## Next 3 tasks

1. **Archi:** fill missing keys in `.env.local` — Supabase anon/service, Stripe publishable + webhook secret, Anthropic API key. Rotate the Resend key (it was pasted in chat).
2. `npm install`, read `node_modules/next/dist/docs/` (breaking changes vs training data), then build the landing page (what/who/single CTA) + email-capture API route.
3. Create `waitlist_signups` table in Supabase, wire the capture form end-to-end, `/verify` the flow.

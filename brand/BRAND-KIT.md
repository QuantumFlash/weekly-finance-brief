# Brand Kit — Weekly Finance Brief

Everything to set up the social accounts + a branded email in ~15 minutes.
(I can't create accounts/Gmail or solve their CAPTCHAs/phone checks — that's yours — but here's the kit so it's fast and consistent.)

## Identity

- **Display name (everywhere):** `Weekly Finance Brief`
- **Website / link in bio:** `https://weeklyfinancebrief.com`
- **Avatar:** `brand/avatar.png` (1000×1000, circle-safe WFB mark)
- **Banner / header:** `brand/banner.png` (1500×500 — fits X; for Facebook crop the centre, ~820×312)
- **Colours:** background `#09090b`, accent emerald `#34d399` / `#10b981`, text `#fafafa`

## Handle (the binding constraint is X = 15 chars max)

Pick ONE and grab it on all four for consistency. Check availability as you go:
1. `weeklyfinbrief` (14) ← recommended
2. `theweeklybrief` (14)
3. `wkfinancebrief` (14)

## Bios (copy-paste)

**X / Twitter (≤160):**
> The week in markets, in five minutes — what happened, why it matters, what to watch. Plain English, for people who aren't finance pros. Not advice. Free week ↓

**Instagram (≤150):**
> The week in markets, in 5 minutes 📊 For people who invest but aren't finance pros. Plain English, never advice. Free 7-day trial 👇

**TikTok (≤80):**
> The week in markets in 5 min. Plain English, not advice. Free week 👇

**Facebook Page — short description:**
> One plain-English email a week on what happened in markets, why it matters, and what to watch next. For busy people with investments, not finance professionals. Educational only — never investment advice.

**LinkedIn (if you make a company page) — tagline:**
> The week in markets, explained in five minutes.

## A better idea than a throwaway Gmail: a real branded email

Instead of a Gmail nobody controls cleanly, use an address on the domain you already own:
**`hello@weeklyfinancebrief.com`** → forwards straight to your personal inbox.

It's more professional, *you* control it, and it can receive the verification emails when you sign up for the social/scheduler accounts — so you can register them with the brand address. Setup (Cloudflare, ~5 clicks, free):
1. Cloudflare dashboard → your domain → **Email** → **Email Routing** → **Get started / Enable**.
2. Cloudflare auto-adds the MX/TXT records (won't clash with Resend — that's on the `send.` subdomain).
3. **Create address** → `hello@weeklyfinancebrief.com` → **Destination** = your personal Gmail → verify (one click in the email Cloudflare sends you).
4. Done — anything to `hello@` lands in your inbox. (Want `contact@`, `sten@`, etc.? Add more the same way.)
*(If you'd rather I do it: create a fresh Cloudflare API token scoped to this zone's DNS + Email Routing and paste it — I'll configure it.)*

## Account-creation checklist (do once per platform)

For X, Facebook (Page), Instagram, TikTok:
- [ ] Sign up (ideally with `hello@weeklyfinancebrief.com` once email routing is on)
- [ ] Display name: **Weekly Finance Brief** · Handle: your chosen one
- [ ] Avatar: `brand/avatar.png` · Banner: `brand/banner.png`
- [ ] Bio: paste from above · Link: `weeklyfinancebrief.com`
- [ ] (Instagram/TikTok) switch to a **Business/Creator** account — needed for the scheduler to post
- [ ] (Facebook) it must be a **Page**, not a personal profile

## Then the scheduler

Create a free **Metricool** or **Publer** account, connect all four, and my weekly content packs feed straight into it.

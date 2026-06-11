/**
 * Comp a free subscriber — a 100%-off, forever Stripe subscription so the
 * person is entitled like any subscriber but is never charged. Durable:
 * survives the on-demand Stripe sync (unlike a hand-edited DB row).
 *
 * Usage (LIVE comp — override the Stripe key with the live one):
 *   COMP_STRIPE_KEY=sk_live_... node --env-file=.env.local --import=tsx \
 *     scripts/compSubscriber.ts <email> [deliveryDay 0-6, default 1=Mon]
 *
 * Supabase + Resend come from .env.local (same project for test & live).
 */
import Stripe from "stripe";
import { Resend } from "resend";

import { env } from "../lib/env";
import { DAY_NAMES } from "../lib/profile";
import { ensureProfile, findOrCreateUser } from "../lib/signup";
import { supabaseAdmin } from "../lib/supabase/admin";

const COMP_COUPON_ID = "wfb_comp_100";
const PRICE_LOOKUP_KEY = "wfb_monthly_core";

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const day = Number(process.argv[3] ?? "1");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("usage: compSubscriber.ts <email> [deliveryDay 0-6]");
  }
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new Error("deliveryDay must be 0 (Sun) .. 6 (Sat)");
  }

  const stripeKey = process.env.COMP_STRIPE_KEY ?? process.env.STRIPE_SECRET_KEY!;
  const stripe = new Stripe(stripeKey);
  const live = stripeKey.startsWith("sk_live_");
  console.log(`[comp] ${email}, day=${DAY_NAMES[day]}, mode=${live ? "LIVE" : "test"}`);

  // 1. App user + profile (delivery day)
  const { userId } = await findOrCreateUser(email);
  await ensureProfile(userId, day);
  console.log(`[comp] user ${userId.slice(0, 8)} + profile ready`);

  // 2. Stripe customer
  const found = await stripe.customers.list({ email, limit: 1 });
  const customer =
    found.data[0] ??
    (await stripe.customers.create({ email, metadata: { user_id: userId, comp: "true" } }));
  console.log(`[comp] customer ${customer.id}`);

  // 3. 100%-off forever coupon (idempotent)
  try {
    await stripe.coupons.retrieve(COMP_COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: COMP_COUPON_ID,
      percent_off: 100,
      duration: "forever",
      name: "Complimentary (100% off)",
    });
    console.log(`[comp] created coupon ${COMP_COUPON_ID}`);
  }

  // 4. Resolve the monthly price on this account
  const prices = await stripe.prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  let priceId = prices.data[0]?.id;
  if (!priceId) {
    const product = await stripe.products.create({ name: "Weekly Finance Brief" });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 500,
      currency: "eur",
      recurring: { interval: "month" },
      lookup_key: PRICE_LOOKUP_KEY,
    });
    priceId = price.id;
  }

  // 5. Active subscription, 100% off — €0, no payment method needed
  const existingSubs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 5,
  });
  let sub = existingSubs.data.find((s) => s.status === "active" || s.status === "trialing");
  if (!sub) {
    sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      discounts: [{ coupon: COMP_COUPON_ID }],
      metadata: { comp: "true" },
    });
  }
  console.log(`[comp] subscription ${sub.id} status=${sub.status}`);

  // 6. Mirror row (so the send pass sees them as entitled)
  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end ??
    null;
  await supabaseAdmin().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  await supabaseAdmin().from("subscription_events").insert({
    user_id: userId,
    stripe_customer_id: customer.id,
    type: "comp.granted",
    payload: { email, day, subscription: sub.id },
  });
  console.log(`[comp] mirror row synced (status=${sub.status})`);

  // 7. Welcome email
  const baseUrl = process.env.APP_BASE_URL ?? "https://weeklyfinancebrief.com";
  const dayName = DAY_NAMES[day];
  const html = [
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#fafafa;">`,
    `<div style="max-width:560px;margin:0 auto;padding:36px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">`,
    `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#71717a;margin:0 0 24px;">Weekly Finance Brief</p>`,
    `<h1 style="font-size:22px;line-height:1.35;margin:0 0 14px;">Welcome — you have a complimentary subscription</h1>`,
    `<p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">You've been given a free subscription to Weekly Finance Brief. Every <strong>${dayName}</strong> you'll get one plain-English recap of markets — what happened, why it matters, and what to watch next — in about five minutes.</p>`,
    `<p style="margin:0 0 28px;"><a href="${baseUrl}/login" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;">Go to your account</a></p>`,
    `<p style="font-size:14px;line-height:1.7;color:#52525b;margin:0 0 6px;">You can change your delivery day or browse past issues anytime from your account. There's nothing to pay — ever.</p>`,
    `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e4e7;"><p style="font-size:13px;color:#a1a1aa;margin:0;">Educational information only — not investment advice.</p></div>`,
    `</div></body></html>`,
  ].join("\n");
  const resend = new Resend(env.resendApiKey());
  const { data, error } = await resend.emails.send({
    from: `Weekly Finance Brief <${env.emailFrom()}>`,
    to: email,
    subject: `Weekly Finance Brief: your complimentary subscription`,
    html,
    text: `You've been given a free subscription to Weekly Finance Brief. Your brief arrives every ${dayName}. Account: ${baseUrl}/login. Educational information only — not investment advice.`,
  });
  if (error) {
    console.error(`[comp] welcome email failed: ${error.message}`);
  } else {
    console.log(`[comp] welcome email sent: ${data?.id}`);
  }
  console.log(`[comp] DONE — ${email} is a free subscriber (delivery: ${dayName}).`);
}

void main();

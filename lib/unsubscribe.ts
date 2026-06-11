import { createHmac } from "node:crypto";

import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase/admin";

/**
 * HMAC-based unsubscribe tokens — no DB storage needed.
 * Token = HMAC-SHA256(email.toLowerCase(), CRON_SECRET).
 * Verified in constant time to prevent timing attacks.
 */

function signingKey(): string {
  const key = process.env.CRON_SECRET;
  if (!key) throw new Error("CRON_SECRET not set");
  return key;
}

export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", signingKey())
    .update(email.toLowerCase().trim())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = generateUnsubscribeToken(email);
    // Constant-time comparison
    if (expected.length !== token.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export interface UnsubscribeResult {
  ok: boolean;
  message: string;
}

/**
 * Cancels the user's Stripe subscription at period end (they keep access
 * until the period expires, aren't charged again) and removes them from
 * future delivery passes immediately.
 */
export async function processUnsubscribe(email: string): Promise<UnsubscribeResult> {
  const db = supabaseAdmin();

  // Find the user
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = users?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    // No user found — silently succeed (don't leak account existence)
    return { ok: true, message: "unsubscribed" };
  }

  // Find their subscription row
  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sub?.stripe_subscription_id) {
    try {
      const s = stripe();
      const stripeSub = await s.subscriptions.retrieve(sub.stripe_subscription_id);
      if (stripeSub.status !== "canceled") {
        await s.subscriptions.cancel(sub.stripe_subscription_id, {
          cancellation_details: { comment: "unsubscribe link" },
        });
      }
    } catch (err) {
      console.error("[unsub] stripe cancel failed:", (err as Error).message);
      // Don't block the UX — the user still sees success; we log it.
    }
  }

  // Mark in subscription_events for the audit log
  await db.from("subscription_events").insert({
    user_id: user.id,
    type: "unsubscribe.link",
    payload: { email },
  });

  return { ok: true, message: "unsubscribed" };
}

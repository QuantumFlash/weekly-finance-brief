import type Stripe from "stripe";

import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Billing state management WITHOUT webhook dependency (local-first launch):
 * Stripe is the source of truth; we sync on demand (account page views and
 * post-checkout redirects) and from the weekly pipeline before sending.
 * The webhook route additionally syncs in real time once publicly deployed.
 */

export interface SubscriptionRecord {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
}

export async function logSubscriptionEvent(
  type: string,
  details: {
    userId?: string | null;
    stripeCustomerId?: string | null;
    payload?: unknown;
  },
): Promise<void> {
  const { error } = await supabaseAdmin().from("subscription_events").insert({
    type,
    user_id: details.userId ?? null,
    stripe_customer_id: details.stripeCustomerId ?? null,
    payload: details.payload ?? {},
  });
  if (error) {
    // Event logging must never break the billing flow.
    console.error("[billing] failed to log event", type, error.message);
  }
}

/** Find (by stored mapping, then by Stripe email search) or create the customer. */
export async function getOrCreateCustomerId(
  userId: string,
  email: string,
): Promise<string> {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (row?.stripe_customer_id) {
    return row.stripe_customer_id as string;
  }

  const s = stripe();
  const found = await s.customers.list({ email, limit: 1 });
  const customer =
    found.data[0] ??
    (await s.customers.create({ email, metadata: { user_id: userId } }));

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      status: "none",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    // Non-fatal: Stripe remains the source of truth. Before migrations have
    // run, the mapping is simply re-derived from Stripe on each request.
    console.error("[billing] failed to store customer mapping:", error.message);
  }
  await logSubscriptionEvent("customer.linked", {
    userId,
    stripeCustomerId: customer.id,
  });
  return customer.id;
}

const STATUS_RANK: Record<string, number> = {
  active: 6,
  trialing: 5,
  past_due: 4,
  unpaid: 3,
  incomplete: 2,
  canceled: 1,
};

/** Basil-era API moved current_period_end onto subscription items; cover both. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const direct = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const epoch = direct ?? fromItem;
  return epoch ? new Date(epoch * 1000).toISOString() : null;
}

/**
 * Pull current subscription truth from Stripe and mirror it locally.
 * Returns the up-to-date record.
 */
export async function syncSubscriptionForUser(
  userId: string,
  email: string,
): Promise<SubscriptionRecord> {
  const customerId = await getOrCreateCustomerId(userId, email);
  const s = stripe();
  const subs = await s.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  let best: Stripe.Subscription | null = null;
  for (const sub of subs.data) {
    if (
      !best ||
      (STATUS_RANK[sub.status] ?? 0) > (STATUS_RANK[best.status] ?? 0) ||
      ((STATUS_RANK[sub.status] ?? 0) === (STATUS_RANK[best.status] ?? 0) &&
        sub.created > best.created)
    ) {
      best = sub;
    }
  }

  const record: SubscriptionRecord = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: best?.id ?? null,
    status: best?.status ?? "none",
    current_period_end: best ? periodEnd(best) : null,
  };

  const { error } = await supabaseAdmin()
    .from("subscriptions")
    .upsert(
      { ...record, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error("[billing] failed to mirror subscription:", error.message);
  }
  await logSubscriptionEvent("status.synced", {
    userId,
    stripeCustomerId: customerId,
    payload: { status: record.status, subscription: record.stripe_subscription_id },
  });
  return record;
}

/** True if this status entitles the user to receive the weekly brief. */
export function isEntitled(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

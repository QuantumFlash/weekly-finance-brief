import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { logSubscriptionEvent, syncSubscriptionForUser } from "../../../../../lib/billing";
import { stripe } from "../../../../../lib/stripe";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";

/**
 * POST /api/stripe/webhook — signature-verified Stripe webhook.
 *
 * NOTE (local-first launch): billing correctness does NOT depend on this
 * route — subscription state is synced on demand (account page, checkout
 * return, weekly pipeline). This route adds real-time sync + a complete
 * audit trail once the app is deployed publicly (or `stripe listen` runs
 * locally with STRIPE_WEBHOOK_SECRET set).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Append-only audit log of every received event (compact payload).
  const objectId =
    (event.data.object as { id?: string }).id ?? null;
  await logSubscriptionEvent(`webhook:${event.type}`, {
    payload: { id: event.id, object: objectId },
  });

  // Keep the local mirror fresh on subscription lifecycle changes.
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const { data: row } = await supabaseAdmin()
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (row?.user_id) {
      const { data: userData } = await supabaseAdmin().auth.admin.getUserById(
        row.user_id as string,
      );
      const email = userData.user?.email;
      if (email) {
        await syncSubscriptionForUser(row.user_id as string, email);
      }
    }
  }

  return NextResponse.json({ received: true });
}

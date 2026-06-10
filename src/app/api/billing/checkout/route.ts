import { NextResponse } from "next/server";

import { getOrCreateCustomerId } from "../../../../../lib/billing";
import { ensureMonthlyPriceId, stripe } from "../../../../../lib/stripe";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

/**
 * POST /api/billing/checkout — starts a Stripe Checkout subscription session.
 * Plain form POST from the account page; responds with a 303 redirect to Stripe.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = new URL(request.url).origin;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/login", origin), 303);
  }

  try {
    const customerId = await getOrCreateCustomerId(user.id, user.email);
    const priceId = await ensureMonthlyPriceId();
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/account?checkout=cancelled`,
    });
    if (!session.url) {
      throw new Error("Checkout session has no URL");
    }
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[checkout] failed:", (err as Error).message);
    return NextResponse.redirect(
      new URL("/account?checkout=error", origin),
      303,
    );
  }
}

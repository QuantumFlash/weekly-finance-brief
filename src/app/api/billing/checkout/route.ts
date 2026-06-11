import { NextResponse } from "next/server";

import { createSubscriptionCheckout } from "../../../../../lib/billing";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

/**
 * POST /api/billing/checkout — starts a subscription Checkout session from
 * the account page. Shares the signup helper: first-time customers get the
 * 7-day trial automatically; returning customers subscribe without one
 * (trials can't be farmed). 303 redirect to Stripe.
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
    const { url } = await createSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      origin,
    });
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("[checkout] failed:", (err as Error).message);
    return NextResponse.redirect(
      new URL("/account?checkout=error", origin),
      303,
    );
  }
}

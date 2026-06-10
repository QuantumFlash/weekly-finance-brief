import { NextResponse } from "next/server";

import { getOrCreateCustomerId } from "../../../../../lib/billing";
import { stripe } from "../../../../../lib/stripe";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

/**
 * POST /api/billing/portal — opens the Stripe customer portal
 * (manage payment method, cancel subscription).
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
    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[portal] failed:", (err as Error).message);
    return NextResponse.redirect(new URL("/account?portal=error", origin), 303);
  }
}

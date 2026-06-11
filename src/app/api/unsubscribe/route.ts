import { NextResponse } from "next/server";

import { processUnsubscribe, verifyUnsubscribeToken } from "../../../../lib/unsubscribe";

/**
 * GET /api/unsubscribe?email=...&token=...
 * Verifies the HMAC token and cancels the subscription.
 * Redirects to /unsubscribe with a status param.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", origin));
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", origin));
  }

  try {
    await processUnsubscribe(email);
    return NextResponse.redirect(new URL("/unsubscribe?status=done", origin));
  } catch (err) {
    console.error("[unsub] failed:", (err as Error).message);
    return NextResponse.redirect(new URL("/unsubscribe?status=error", origin));
  }
}

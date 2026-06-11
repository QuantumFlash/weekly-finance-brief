import { NextResponse } from "next/server";

import { createSubscriptionCheckout } from "../../../../lib/billing";
import { ensureProfile, findOrCreateUser } from "../../../../lib/signup";

/**
 * POST /api/signup — card-gated free-trial signup.
 * Creates/finds the user, stores the delivery-day profile, and returns a
 * Stripe Checkout URL (7-day trial for first-time customers, card required,
 * $0 today). Generic responses — no email enumeration.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<NextResponse> {
  let email: unknown;
  let deliveryDay: unknown;
  try {
    ({ email, deliveryDay } = (await request.json()) as {
      email?: unknown;
      deliveryDay?: unknown;
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (typeof email !== "string") {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  const normalised = email.trim().toLowerCase();
  if (normalised.length > 254 || !EMAIL_RE.test(normalised)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const day = Number(deliveryDay);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return NextResponse.json(
      { ok: false, error: "Please choose a delivery day." },
      { status: 400 },
    );
  }

  try {
    const { userId } = await findOrCreateUser(normalised);
    await ensureProfile(userId, day);
    const { url } = await createSubscriptionCheckout({
      userId,
      email: normalised,
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[signup] failed:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Something went wrong — please try again." },
      { status: 502 },
    );
  }
}

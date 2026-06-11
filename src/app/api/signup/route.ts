import { NextResponse } from "next/server";

import { signupWithTrial } from "../../../../lib/signup";

/**
 * POST /api/signup — free-trial signup with delivery-day choice.
 * Response is always generic on success paths: never reveals whether the
 * email already had an account (no enumeration).
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
    await signupWithTrial(normalised, day);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup] failed:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Something went wrong — please try again." },
      { status: 502 },
    );
  }
}

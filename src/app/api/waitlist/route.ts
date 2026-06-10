import { NextResponse } from "next/server";

import { env } from "../../../../lib/env";

/**
 * POST /api/waitlist — M1 email capture.
 *
 * Inserts into public.waitlist_signups via Supabase PostgREST using the
 * server-only secret key (RLS is enabled with no policies; only this route
 * can write). Duplicate emails are silently ignored and reported as success,
 * so responses never leak whether an address is already subscribed.
 *
 * Logging: status codes only — never log email addresses (PII) or keys.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<NextResponse> {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
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

  let supabaseUrl: string;
  let serviceKey: string;
  try {
    supabaseUrl = env.supabaseUrl();
    serviceKey = env.supabaseServiceKey();
  } catch (err) {
    console.error("[waitlist] env not configured:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Signup is not available right now." },
      { status: 503 },
    );
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/waitlist_signups?on_conflict=email`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify([{ email: normalised, source: "landing" }]),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    console.error("[waitlist] insert failed with status", res.status);
    return NextResponse.json(
      { ok: false, error: "Something went wrong — please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

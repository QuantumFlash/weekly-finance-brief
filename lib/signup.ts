import { Resend } from "resend";

import { env } from "./env";
import { DAY_NAMES, ensureTrialProfile, markWelcomed, TRIAL_DAYS } from "./profile";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Trial signup flow (M5):
 *   email + chosen delivery day
 *     -> find-or-create auth user
 *     -> profile with 7-day trial (never reset on re-signup)
 *     -> branded welcome email via Resend containing a magic sign-in link
 *
 * Privacy: callers always return a generic success — this module never leaks
 * whether an email already existed. Resend sandbox caveat: until a domain is
 * verified, only the owner's address actually receives mail; other addresses
 * record a failed send (logged, not surfaced to the visitor).
 */

async function findOrCreateUser(
  email: string,
): Promise<{ userId: string; created: boolean }> {
  const admin = supabaseAdmin();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (!createError && created.user) {
    return { userId: created.user.id, created: true };
  }

  // Most likely "already registered" — find them. Tiny user base: page scan.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    throw new Error(`signup: listUsers failed: ${listError.message}`);
  }
  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!existing) {
    throw new Error(
      `signup: createUser failed (${createError?.message}) and user not found`,
    );
  }
  return { userId: existing.id, created: false };
}

/**
 * Deliverability note (found 2026-06-11): welcome emails embedding the
 * Supabase auth-verify action link were silently dropped by Gmail (phishing
 * heuristics: auth URL + button + shared sandbox sender), while plain emails
 * delivered instantly. So the welcome email carries NO auth link — it points
 * to /login, and the actual magic link is sent by Supabase's own sender,
 * which is proven deliverable.
 */
function welcomeHtml(params: {
  dayName: string;
  loginUrl: string;
  isReturning: boolean;
}): string {
  const container =
    "max-width:560px;margin:0 auto;padding:36px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;";
  const button =
    "display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;";
  const muted = "font-size:13px;line-height:1.6;color:#a1a1aa;";

  const heading = params.isReturning
    ? "Welcome back to Weekly Finance Brief"
    : "Welcome to Weekly Finance Brief";
  const intro = params.isReturning
    ? `Your delivery day is set to <strong>${params.dayName}</strong>. You can sign in anytime — we’ll email you a one-tap link.`
    : `Your free week starts now. Every <strong>${params.dayName}</strong>, you’ll get one plain-English brief: what happened in markets, why it matters, and what to watch next — readable in five minutes.`;

  return [
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#fafafa;">`,
    `<div style="${container}">`,
    `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#71717a;margin:0 0 24px;">Weekly Finance Brief</p>`,
    `<h1 style="font-size:22px;line-height:1.35;margin:0 0 14px;">${heading}</h1>`,
    `<p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">${intro}</p>`,
    `<p style="margin:0 0 28px;"><a href="${params.loginUrl}" style="${button}">Go to your account</a></p>`,
    `<p style="font-size:14px;line-height:1.7;color:#52525b;margin:0 0 6px;">From your account you can change your delivery day anytime, browse the archive, and subscribe for $5/month when your free week ends.</p>`,
    `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e4e7;">`,
    `<p style="${muted}">Educational information only — not investment advice.</p>`,
    `</div></div></body></html>`,
  ].join("\n");
}

export interface SignupResult {
  userId: string;
  createdUser: boolean;
  emailSent: boolean;
}

export async function signupWithTrial(
  email: string,
  deliveryDay: number,
): Promise<SignupResult> {
  const { userId, created } = await findOrCreateUser(email);
  const { isNew } = await ensureTrialProfile(userId, deliveryDay);
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const loginUrl = `${baseUrl}/login`;
  const dayName = DAY_NAMES[deliveryDay];
  // Copy keys off the USER, not the profile: an existing account re-signing
  // up (or predating the profiles table) gets "welcome back", not a fresh
  // trial pitch.
  const isReturning = !created;

  let emailSent = false;
  try {
    const resend = new Resend(env.resendApiKey());
    const { error } = await resend.emails.send({
      from: `Weekly Finance Brief <${env.emailFrom()}>`,
      to: email,
      // Subject style matters: phish-pattern phrases ("sign-in link",
      // "free week starts now") get silently dropped by inbox filters on the
      // sandbox sender (bisected 2026-06-11). Keep subjects informational.
      subject: !isReturning
        ? `Weekly Finance Brief: first issue lands ${dayName}`
        : `Weekly Finance Brief: delivery day set to ${dayName}`,
      html: welcomeHtml({ dayName, loginUrl, isReturning }),
      text: [
        !isReturning
          ? `Welcome to Weekly Finance Brief. Your ${TRIAL_DAYS}-day free trial has started.`
          : "Welcome back to Weekly Finance Brief.",
        `Delivery day: ${dayName}.`,
        `Your account: ${loginUrl}`,
        "Educational information only — not investment advice.",
      ].join("\n\n"),
    });
    if (error) {
      throw new Error(error.message);
    }
    emailSent = true;
    if (isNew && !isReturning) {
      await markWelcomed(userId);
    }
  } catch (err) {
    // Sandbox-bounded failure (or transient): log without PII, don't leak to visitor.
    console.error("[signup] welcome email failed:", (err as Error).message);
  }

  return { userId, createdUser: created, emailSent };
}

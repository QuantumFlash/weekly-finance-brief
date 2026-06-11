import { Resend } from "resend";

import { env } from "./env";
import { DAY_NAMES, getProfile, markWelcomed } from "./profile";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Signup flow (M5.1 — card-gated trial):
 *   email + delivery day -> find-or-create auth user + profile (day only)
 *   -> Stripe Checkout with a 7-day trial (card required, $0 today; trial
 *      only for customers with no prior subscription — abuse guard)
 *   -> /welcome verifies the session and sends the branded welcome email.
 *
 * Entitlement is Stripe-only (active/trialing/past_due). The old app-level
 * trial (profiles.trial_ends_at) is legacy and no longer granted.
 *
 * Deliverability rules (bisected 2026-06-11): no auth links in app emails;
 * informational subjects only. Magic links stay with Supabase's own sender.
 */

export async function findOrCreateUser(
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

/** Create or update the profile with the chosen delivery day (no app trial). */
export async function ensureProfile(
  userId: string,
  deliveryDay: number,
): Promise<void> {
  const db = supabaseAdmin();
  const existing = await getProfile(userId);
  if (existing) {
    if (existing.delivery_day !== deliveryDay) {
      const { error } = await db
        .from("profiles")
        .update({ delivery_day: deliveryDay, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) {
        console.error("[profile] day update failed:", error.message);
      }
    }
    return;
  }
  const { error } = await db.from("profiles").insert({
    user_id: userId,
    delivery_day: deliveryDay,
    trial_ends_at: null,
  });
  if (error) {
    throw new Error(`[profile] insert failed: ${error.message}`);
  }
}

function welcomeHtml(params: { dayName: string; loginUrl: string }): string {
  const container =
    "max-width:560px;margin:0 auto;padding:36px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;";
  const button =
    "display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;";
  const muted = "font-size:13px;line-height:1.6;color:#a1a1aa;";

  return [
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#fafafa;">`,
    `<div style="${container}">`,
    `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#71717a;margin:0 0 24px;">Weekly Finance Brief</p>`,
    `<h1 style="font-size:22px;line-height:1.35;margin:0 0 14px;">Welcome to Weekly Finance Brief</h1>`,
    `<p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">Your free week is underway. Every <strong>${params.dayName}</strong>, you’ll get one plain-English brief: what happened in markets, why it matters, and what to watch next — readable in five minutes.</p>`,
    `<p style="margin:0 0 28px;"><a href="${params.loginUrl}" style="${button}">Go to your account</a></p>`,
    `<p style="font-size:14px;line-height:1.7;color:#52525b;margin:0 0 6px;">From your account you can change your delivery day, browse the archive, and manage billing. Your trial converts to $5/month after 7 days — cancel anytime before then and you won’t be charged.</p>`,
    `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e4e7;">`,
    `<p style="${muted}">Educational information only — not investment advice.</p>`,
    `</div></div></body></html>`,
  ].join("\n");
}

/** Idempotent (via profiles.welcomed_at): sends the post-checkout welcome. */
export async function sendWelcomeEmailOnce(
  userId: string,
  email: string,
): Promise<void> {
  const profile = await getProfile(userId);
  if (profile?.welcomed_at) {
    return;
  }
  const deliveryDay = profile?.delivery_day ?? 1;
  const dayName = DAY_NAMES[deliveryDay];
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  try {
    const resend = new Resend(env.resendApiKey());
    const { error } = await resend.emails.send({
      from: `Weekly Finance Brief <${env.emailFrom()}>`,
      to: email,
      subject: `Weekly Finance Brief: first issue lands ${dayName}`,
      html: welcomeHtml({ dayName, loginUrl: `${baseUrl}/login` }),
      text: [
        "Welcome to Weekly Finance Brief. Your free week is underway.",
        `Delivery day: ${dayName}.`,
        `Your account: ${baseUrl}/login`,
        "Trial converts to $5/month after 7 days — cancel anytime before then.",
        "Educational information only — not investment advice.",
      ].join("\n\n"),
    });
    if (error) {
      throw new Error(error.message);
    }
    await markWelcomed(userId);
  } catch (err) {
    console.error("[welcome] email failed:", (err as Error).message);
  }
}

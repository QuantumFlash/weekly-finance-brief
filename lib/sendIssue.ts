import { Resend } from "resend";

import { isEntitled } from "./billing";
import { env } from "./env";
import type { Profile } from "./profile";
import { supabaseAdmin } from "./supabase/admin";

let resendClient: Resend | null = null;

function resend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey());
  }
  return resendClient;
}

export interface SendReport {
  attempted: number;
  sent: number;
  failed: number;
  skippedAlreadyDelivered: number;
}

/**
 * Entitled = Stripe active/trialing/past_due ONLY (card-gated trials live in
 * Stripe as `trialing` subscriptions; the legacy app-level trial is gone).
 * When `forDay` is given (0=Sun..6=Sat), only users whose chosen delivery
 * day matches are returned (no profile -> Monday).
 */
export async function listEntitledRecipients(
  forDay?: number,
): Promise<Array<{ email: string; userId: string }>> {
  const db = supabaseAdmin();
  const [{ data: subRows, error: subError }, { data: profRows, error: profError }] =
    await Promise.all([
      db.from("subscriptions").select("user_id, status"),
      db.from("profiles").select("user_id, delivery_day, trial_ends_at, welcomed_at"),
    ]);
  if (subError) {
    throw new Error(`failed to list subscriptions: ${subError.message}`);
  }
  if (profError) {
    throw new Error(`failed to list profiles: ${profError.message}`);
  }

  const profByUser = new Map<string, Profile>(
    (profRows ?? []).map((p) => [p.user_id as string, p as Profile]),
  );
  const statusByUser = new Map<string, string>(
    (subRows ?? []).map((s) => [s.user_id as string, s.status as string]),
  );
  const userIds = new Set<string>([...profByUser.keys(), ...statusByUser.keys()]);

  const recipients: Array<{ email: string; userId: string }> = [];
  for (const userId of userIds) {
    const profile = profByUser.get(userId) ?? null;
    const entitled = isEntitled(statusByUser.get(userId) ?? "none");
    if (!entitled) {
      continue;
    }
    const day = profile?.delivery_day ?? 1;
    if (forDay !== undefined && day !== forDay) {
      continue;
    }
    const { data } = await db.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (email) {
      recipients.push({ email, userId });
    }
  }
  return recipients;
}

/**
 * Send one issue to recipients (optionally only those whose delivery day is
 * `forDay`), skipping anyone who already received it — fully idempotent, so
 * the daily pipeline can re-run safely. Failures are per-recipient.
 * Resend sandbox: only the owner's address is deliverable until a domain is
 * verified; others record as failed (honest state).
 */
export async function sendIssueEmail(params: {
  issueId: string;
  subject: string;
  html: string;
  text: string;
  forDay?: number;
}): Promise<SendReport> {
  const db = supabaseAdmin();

  const { data: delivered, error: deliveredError } = await db
    .from("deliveries")
    .select("email")
    .eq("issue_id", params.issueId)
    .eq("status", "sent");
  if (deliveredError) {
    throw new Error(`failed to read deliveries: ${deliveredError.message}`);
  }
  const alreadyDelivered = new Set(
    (delivered ?? []).map((d) => (d.email as string).toLowerCase()),
  );

  const recipients = await listEntitledRecipients(params.forDay);
  const report: SendReport = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skippedAlreadyDelivered: 0,
  };

  for (const recipient of recipients) {
    if (alreadyDelivered.has(recipient.email.toLowerCase())) {
      report.skippedAlreadyDelivered += 1;
      continue;
    }
    report.attempted += 1;

    let status = "sent";
    let providerId: string | null = null;
    let errorText: string | null = null;
    try {
      const { data, error } = await resend().emails.send({
        from: `Weekly Finance Brief <${env.emailFrom()}>`,
        to: recipient.email,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) {
        throw new Error(error.message);
      }
      providerId = data?.id ?? null;
      report.sent += 1;
    } catch (err) {
      status = "failed";
      errorText = (err as Error).message;
      report.failed += 1;
      console.error("[send] delivery failed (status only logged)");
    }

    const { error: insertError } = await db.from("deliveries").upsert(
      {
        issue_id: params.issueId,
        email: recipient.email,
        user_id: recipient.userId,
        status,
        provider_id: providerId,
        error: errorText,
      },
      { onConflict: "issue_id,email" },
    );
    if (insertError) {
      console.error("[send] failed to record delivery:", insertError.message);
    }
  }

  return report;
}

/** Ops alert to the admin — used by the pipeline on failure. */
export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("[alert] ADMIN_EMAIL not set; alert not sent:", subject);
    return;
  }
  try {
    const { error } = await resend().emails.send({
      from: `Weekly Finance Brief Ops <${env.emailFrom()}>`,
      to: adminEmail,
      subject: `[WFB ops] ${subject}`,
      text: body,
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("[alert] failed to send admin alert:", (err as Error).message);
  }
}

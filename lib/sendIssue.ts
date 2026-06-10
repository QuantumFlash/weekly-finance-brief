import { Resend } from "resend";

import { isEntitled } from "./billing";
import { env } from "./env";
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
}

/** Entitled recipients = subscription rows whose status grants the brief. */
export async function listEntitledRecipients(): Promise<
  Array<{ email: string; userId: string }>
> {
  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("subscriptions")
    .select("user_id, status");
  if (error) {
    throw new Error(`failed to list subscriptions: ${error.message}`);
  }

  const recipients: Array<{ email: string; userId: string }> = [];
  for (const row of rows ?? []) {
    if (!isEntitled(row.status as string)) {
      continue;
    }
    const { data } = await db.auth.admin.getUserById(row.user_id as string);
    const email = data.user?.email;
    if (email) {
      recipients.push({ email, userId: row.user_id as string });
    }
  }
  return recipients;
}

/**
 * Send one issue to all entitled subscribers, recording a delivery row per
 * recipient. Failures are per-recipient, never abort the batch.
 * NOTE: until a sending domain is verified in Resend, the sandbox sender can
 * only deliver to the account owner's address — other recipients will record
 * as failed (which is the honest state of the world).
 */
export async function sendIssueEmail(params: {
  issueId: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendReport> {
  const recipients = await listEntitledRecipients();
  const db = supabaseAdmin();
  const report: SendReport = { attempted: recipients.length, sent: 0, failed: 0 };

  for (const recipient of recipients) {
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
      console.error(`[send] delivery failed (status only logged)`);
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

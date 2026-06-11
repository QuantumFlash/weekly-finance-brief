/**
 * One-off: render the latest stored issue with the current email template and
 * send it to ADMIN_EMAIL, so the new layout can be eyeballed in a real inbox.
 * Run: node --env-file=.env.local --import=tsx scripts/sendTemplatePreview.ts
 * Does NOT touch subscribers or the deliveries table.
 */
import { Resend } from "resend";

import { env } from "../lib/env";
import { generateUnsubscribeToken } from "../lib/unsubscribe";
import { renderBrief } from "../lib/renderBrief";
import { supabaseAdmin } from "../lib/supabase/admin";

async function main() {
  const { data: issue, error } = await supabaseAdmin()
    .from("issues")
    .select("week_label, subject, body_markdown, sent_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !issue) {
    throw new Error(`no issue to preview: ${error?.message}`);
  }

  const to = process.env.ADMIN_EMAIL!;
  const baseUrl = process.env.APP_BASE_URL ?? "https://weeklyfinancebrief.com";
  const token = generateUnsubscribeToken(to);
  const rendered = renderBrief(issue.body_markdown, {
    weekLabel: issue.week_label,
    dateLabel: new Date(issue.sent_at ?? Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    archiveUrl: `${baseUrl}/issues/${issue.week_label}`,
    unsubscribeUrl: `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(to)}&token=${token}`,
  });

  const resend = new Resend(env.resendApiKey());
  const { data, error: sendErr } = await resend.emails.send({
    from: `Weekly Finance Brief <${env.emailFrom()}>`,
    to,
    subject: `[PREVIEW] ${issue.subject}`,
    html: rendered.html,
    text: rendered.text,
  });
  if (sendErr) {
    throw new Error(`send failed: ${sendErr.message}`);
  }
  console.log(`preview sent to ${to}: ${data?.id} (issue ${issue.week_label})`);
}

void main();

/**
 * Manually send the latest published issue to all currently-entitled
 * subscribers right now (off-schedule), via the real production send path
 * (per-recipient unsubscribe, deliveries logging, dedup). Idempotent: anyone
 * who already received this issue is skipped.
 *
 * Run: node --env-file=.env.local --import=tsx scripts/sendIssueNow.ts
 */
import { renderBrief } from "../lib/renderBrief";
import { sendIssueEmail } from "../lib/sendIssue";
import { supabaseAdmin } from "../lib/supabase/admin";

async function main() {
  const { data: issue, error } = await supabaseAdmin()
    .from("issues")
    .select("id, week_label, subject, body_markdown, sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !issue) throw new Error(`no published issue: ${error?.message}`);

  const baseUrl = process.env.APP_BASE_URL ?? "https://weeklyfinancebrief.com";
  const rendered = renderBrief(issue.body_markdown, {
    weekLabel: issue.week_label,
    dateLabel: new Date(issue.sent_at ?? Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    archiveUrl: `${baseUrl}/issues/${issue.week_label}`,
    unsubscribeUrl: `${baseUrl}/api/unsubscribe?email=PLACEHOLDER&token=PLACEHOLDER`,
  });

  const report = await sendIssueEmail({
    issueId: issue.id,
    subject: issue.subject,
    html: rendered.html,
    text: rendered.text,
  });
  console.log(
    `[send-now] issue ${issue.week_label}: attempted=${report.attempted} ` +
      `sent=${report.sent} failed=${report.failed} ` +
      `skipped(already)=${report.skippedAlreadyDelivered}`,
  );
}

void main();

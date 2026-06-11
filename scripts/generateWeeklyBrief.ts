/**
 * generateWeeklyBrief — the daily pipeline (M3 + per-day delivery).
 *
 * Runs DAILY at 07:00 (Task Scheduler). Semantics:
 *   - ONE issue per ISO week. Generated (Gemini ladder -> CLI fallback) on the
 *     first daily run of that week, published to the archive immediately
 *     (status 'sent' = published; per-user timing lives in `deliveries`).
 *   - Each run then delivers the week's issue to entitled users whose chosen
 *     delivery_day matches today (0=Sun..6=Sat). Entitled = Stripe
 *     active/trialing/past_due OR an active free trial. Idempotent: users who
 *     already received this issue are skipped, so re-runs are safe.
 *   - Published issues are immutable: later daily runs reuse the stored
 *     content and never regenerate or rewrite it.
 *
 * Run modes:
 *   npm run brief:weekly   — the real daily run (name kept for history)
 *   npm run brief:dry      — generate + store DRAFT only (never publishes,
 *                            never sends; real runs regenerate over drafts)
 */
import { generateBriefText } from "../lib/generation";
import { parseBrief, renderBrief } from "../lib/renderBrief";
import { sendAdminAlert, sendIssueEmail } from "../lib/sendIssue";
import {
  buildUserMessage,
  collectBriefInputs,
  type BriefInputs,
} from "../lib/sources";
import { supabaseAdmin } from "../lib/supabase/admin";

const DRY_RUN = process.argv.includes("--dry");

interface IssueContent {
  id: string;
  subject: string;
  html: string;
  text: string;
}

async function startRun(): Promise<number | null> {
  const { data, error } = await supabaseAdmin()
    .from("pipeline_runs")
    .insert({ status: "running", detail: DRY_RUN ? "dry run" : null })
    .select("id")
    .single();
  if (error) {
    console.error("[run] could not record run start:", error.message);
    return null;
  }
  return data.id as number;
}

async function finishRun(
  runId: number | null,
  status: "success" | "failed" | "needs_review",
  detail: string,
  issueId?: string,
): Promise<void> {
  if (runId === null) {
    return;
  }
  const { error } = await supabaseAdmin()
    .from("pipeline_runs")
    .update({
      status,
      detail,
      issue_id: issueId ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) {
    console.error("[run] could not record run finish:", error.message);
  }
}

async function storeIssue(params: {
  inputs: BriefInputs;
  subject: string;
  markdown: string;
  html: string;
  text: string;
  model: string;
  publish: boolean;
}): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("issues")
    .upsert(
      {
        week_label: params.inputs.weekLabel,
        subject: params.subject,
        body_markdown: params.markdown,
        body_html: params.html,
        body_text: params.text,
        model: params.model,
        status: params.publish ? "sent" : "draft",
        generated_at: new Date().toISOString(),
        sent_at: params.publish ? new Date().toISOString() : null,
      },
      { onConflict: "week_label" },
    )
    .select("id")
    .single();
  if (error) {
    throw new Error(`failed to store issue: ${error.message}`);
  }
  const issueId = data.id as string;

  // Source snapshots: small metadata only; re-runs replace.
  const snapshots = [
    ...params.inputs.officialSummaries.map((s) => ({
      issue_id: issueId,
      kind: "official",
      ref_id: s.id,
      title: s.title,
      source: s.source,
      url: s.url ?? null,
      published_at: s.date,
    })),
    ...params.inputs.commentaryHeadlines.map((h) => ({
      issue_id: issueId,
      kind: "headline",
      ref_id: h.id,
      title: h.headline,
      source: h.source,
      url: h.url ?? null,
      published_at: h.date,
    })),
    ...params.inputs.indicators.map((i) => ({
      issue_id: issueId,
      kind: "indicator",
      ref_id: i.id,
      title: `${i.name}: ${i.previous} -> ${i.latest} ${i.unit}`,
      source: `FRED ${i.series}`,
      url: null,
      published_at: null,
    })),
  ];
  if (snapshots.length > 0) {
    await db.from("source_snapshots").delete().eq("issue_id", issueId);
    const { error: snapError } = await db.from("source_snapshots").insert(snapshots);
    if (snapError) {
      console.error("[store] snapshot insert failed:", snapError.message);
    }
  }
  return issueId;
}

/** Generate this week's issue fresh and store it. Returns published content. */
async function generateAndStore(
  weekLabel: string,
  publish: boolean,
): Promise<IssueContent> {
  const inputs = await collectBriefInputs();
  console.log(
    `[collect] ${inputs.weekLabel}: ${inputs.officialSummaries.length} official, ` +
      `${inputs.commentaryHeadlines.length} headlines, ${inputs.indicators.length} indicators, ` +
      `${inputs.warnings.length} warnings`,
  );
  for (const warning of inputs.warnings) {
    console.warn(`[collect] warning: ${warning}`);
  }
  if (inputs.indicators.length === 0 && inputs.officialSummaries.length === 0) {
    throw new Error("no usable inputs collected — refusing to generate from nothing");
  }
  if (inputs.weekLabel !== weekLabel) {
    throw new Error(
      `week label drift: expected ${weekLabel}, collected ${inputs.weekLabel}`,
    );
  }

  const generation = await generateBriefText(buildUserMessage(inputs));
  if (generation.status === "needs_review" || !generation.text) {
    throw new NeedsReviewError(
      `generation needs review: ${generation.detail ?? "no text"}`,
    );
  }
  if (generation.detail) {
    console.warn(`[generate] note: ${generation.detail}`);
  }

  const parsed = parseBrief(generation.text);
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const rendered = renderBrief(parsed.markdown, {
    weekLabel: inputs.weekLabel,
    archiveUrl: `${baseUrl}/issues/${inputs.weekLabel}`,
    // Placeholder replaced per-recipient at send time (sendIssue.ts).
    unsubscribeUrl: `${baseUrl}/api/unsubscribe?email=PLACEHOLDER&token=PLACEHOLDER`,
  });

  const issueId = await storeIssue({
    inputs,
    subject: parsed.subject,
    markdown: parsed.markdown,
    html: rendered.html,
    text: rendered.text,
    model: generation.model,
    publish,
  });
  console.log(
    `[store] issue ${inputs.weekLabel} ${publish ? "published" : "stored as draft"} (${issueId})`,
  );
  return { id: issueId, subject: parsed.subject, html: rendered.html, text: rendered.text };
}

class NeedsReviewError extends Error {}

function isoWeekLabelToday(): string {
  // Reuse the same implementation as sources to avoid drift.
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function main(): Promise<void> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekLabel = isoWeekLabelToday();
  console.log(
    `[weekly-brief] daily run starting${DRY_RUN ? " (dry)" : ""}: ${weekLabel}, day=${dayOfWeek}`,
  );
  const runId = await startRun();

  try {
    // 1. Ensure this week's issue exists (published issues are immutable).
    const { data: existing } = await supabaseAdmin()
      .from("issues")
      .select("id, status, subject, body_html, body_text")
      .eq("week_label", weekLabel)
      .maybeSingle();

    let issue: IssueContent;
    if (existing && existing.status === "sent") {
      issue = {
        id: existing.id as string,
        subject: existing.subject as string,
        html: existing.body_html as string,
        text: existing.body_text as string,
      };
      console.log(`[issue] reusing published issue ${weekLabel}`);
    } else {
      // Drafts (from dry rehearsals) are regenerated fresh — generation is free.
      issue = await generateAndStore(weekLabel, !DRY_RUN);
    }

    if (DRY_RUN) {
      await finishRun(
        runId,
        "success",
        existing?.status === "sent"
          ? "dry run: issue already published; nothing to do"
          : "dry run: draft stored, not published, nothing sent",
        issue.id,
      );
      console.log("[weekly-brief] dry run complete");
      return;
    }

    // 2. Deliver to today's recipients (idempotent).
    const report = await sendIssueEmail({
      issueId: issue.id,
      subject: issue.subject,
      html: issue.html,
      text: issue.text,
      forDay: dayOfWeek,
    });
    const detail =
      `issue ${weekLabel}, day ${dayOfWeek}: sent ${report.sent}/${report.attempted}` +
      `, failed ${report.failed}, already-delivered ${report.skippedAlreadyDelivered}`;
    await finishRun(runId, "success", detail, issue.id);
    console.log(`[weekly-brief] done: ${detail}`);
  } catch (err) {
    const detail = (err as Error).message;
    const status = err instanceof NeedsReviewError ? "needs_review" : "failed";
    console.error(`[weekly-brief] pipeline ${status}:`, detail);
    await finishRun(runId, status, detail);
    await sendAdminAlert(`weekly brief pipeline ${status}`, detail);
    process.exitCode = 1;
  }
}

void main();

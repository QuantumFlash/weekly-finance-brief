/**
 * generateWeeklyBrief — the weekly pipeline (M3).
 *
 * Run:
 *   npm run brief:weekly        — full run: collect -> generate -> store -> send
 *   npm run brief:dry           — everything except sending (issue stored as draft)
 *
 * Flow: collect allowlisted sources -> build prompt input -> claude-fable-5
 * (high effort, fallback claude-opus-4-8) -> parse strict markdown -> store
 * issue + source snapshots -> render -> send to entitled subscribers ->
 * record deliveries -> mark sent. Every run is logged to pipeline_runs and
 * failures alert the admin by email. Logs contain status/usage only — never
 * key material or recipient PII beyond what the job requires.
 */
import { generateBriefText } from "../lib/claude";
import { parseBrief, renderBrief } from "../lib/renderBrief";
import { sendAdminAlert, sendIssueEmail } from "../lib/sendIssue";
import {
  buildUserMessage,
  collectBriefInputs,
  type BriefInputs,
} from "../lib/sources";
import { supabaseAdmin } from "../lib/supabase/admin";

const DRY_RUN = process.argv.includes("--dry");

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
  status: "draft" | "needs_review";
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
        status: params.status,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "week_label" },
    )
    .select("id")
    .single();
  if (error) {
    throw new Error(`failed to store issue: ${error.message}`);
  }
  const issueId = data.id as string;

  // Source snapshots: small metadata only.
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
    // Idempotent-enough: clear and re-insert for this issue (re-runs replace).
    await db.from("source_snapshots").delete().eq("issue_id", issueId);
    const { error: snapError } = await db.from("source_snapshots").insert(snapshots);
    if (snapError) {
      console.error("[store] snapshot insert failed:", snapError.message);
    }
  }
  return issueId;
}

async function main(): Promise<void> {
  console.log(`[weekly-brief] pipeline starting${DRY_RUN ? " (dry run)" : ""}`);
  const runId = await startRun();

  try {
    // 1. Collect
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

    // 2. Generate
    const generation = await generateBriefText(buildUserMessage(inputs));
    if (generation.status === "needs_review" || !generation.text) {
      const detail = `generation needs review: ${generation.detail ?? "no text"}`;
      await finishRun(runId, "needs_review", detail);
      await sendAdminAlert("weekly brief needs review", detail);
      console.error(`[weekly-brief] ${detail}`);
      process.exitCode = 1;
      return;
    }
    if (generation.detail) {
      console.warn(`[generate] note: ${generation.detail}`);
    }

    // 3. Parse + render
    const parsed = parseBrief(generation.text);
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const rendered = renderBrief(parsed.markdown, {
      weekLabel: inputs.weekLabel,
      archiveUrl: `${baseUrl}/issues/${inputs.weekLabel}`,
    });

    // 4. Store
    const issueId = await storeIssue({
      inputs,
      subject: parsed.subject,
      markdown: parsed.markdown,
      html: rendered.html,
      text: rendered.text,
      model: generation.model,
      status: "draft",
    });
    console.log(`[store] issue ${inputs.weekLabel} stored (${issueId})`);

    if (DRY_RUN) {
      await finishRun(runId, "success", "dry run: issue stored as draft, no send", issueId);
      console.log("[weekly-brief] dry run complete — draft stored, nothing sent");
      return;
    }

    // 5. Send + mark sent
    const report = await sendIssueEmail({
      issueId,
      subject: parsed.subject,
      html: rendered.html,
      text: rendered.text,
    });
    console.log(
      `[send] attempted=${report.attempted} sent=${report.sent} failed=${report.failed}`,
    );

    const { error: markError } = await supabaseAdmin()
      .from("issues")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", issueId);
    if (markError) {
      console.error("[store] failed to mark issue sent:", markError.message);
    }

    const detail =
      `issue ${inputs.weekLabel} (${generation.model}): ` +
      `${report.sent}/${report.attempted} delivered, ${report.failed} failed` +
      (inputs.warnings.length > 0 ? `; ${inputs.warnings.length} collect warnings` : "");
    await finishRun(runId, "success", detail, issueId);
    console.log(`[weekly-brief] done: ${detail}`);
  } catch (err) {
    const detail = (err as Error).message;
    console.error("[weekly-brief] pipeline failed:", detail);
    await finishRun(runId, "failed", detail);
    await sendAdminAlert("weekly brief pipeline FAILED", detail);
    process.exitCode = 1;
  }
}

void main();

/**
 * generateWeeklyBrief — the weekly pipeline (M3). Run: npx tsx scripts/generateWeeklyBrief.ts
 *
 * Stages (each stubbed until M3; this file is the skeleton/contract):
 *   1. collectSources   — fetch ONLY allowlisted sources (FRED series, official/public
 *                         macro summaries, permitted feeds). No unapproved scraping.
 *   2. normalise        — map raw data to the three labelled input blocks defined in
 *                         prompts/fable-summariser.md (official_summaries,
 *                         commentary_headlines, indicators).
 *   3. generateBrief    — call MODELS.brief (high effort, cached stable system prompt,
 *                         conservative tokens). On refusal/safety limit: one retry on
 *                         MODELS.briefFallback; still failing -> status needs_review,
 *                         alert admin, HOLD the send.
 *   4. storeIssue       — insert into `issues` (+ source_snapshots metadata).
 *   5. (send step lives in a separate module so storage and delivery can be retried
 *      independently; deliveries are recorded per recipient.)
 *
 * Logging: log request/response metadata for debugging — never secrets, never full keys.
 */
import { BRIEF_GENERATION, MODELS } from "../config/models";

export interface OfficialSummary {
  id: string;
  title: string;
  source: string;
  date: string;
  excerpt: string;
}

export interface CommentaryHeadline {
  id: string;
  headline: string;
  source: string;
  date: string;
  snippet: string;
}

export interface Indicator {
  id: string;
  name: string;
  latest: number;
  previous: number;
  unit: string;
  period: string;
}

export interface BriefInputs {
  officialSummaries: OfficialSummary[];
  commentaryHeadlines: CommentaryHeadline[];
  indicators: Indicator[];
}

export interface GeneratedBrief {
  subject: string;
  markdown: string;
  model: string;
  status: "draft" | "needs_review";
}

async function collectSources(): Promise<unknown> {
  // TODO(M3): FRED API (env.fredApiKey), official summaries, permitted feeds.
  throw new Error("not implemented: collectSources (M3)");
}

async function normalise(_raw: unknown): Promise<BriefInputs> {
  // TODO(M3): produce the exact input contract from prompts/fable-summariser.md.
  throw new Error("not implemented: normalise (M3)");
}

async function generateBrief(_inputs: BriefInputs): Promise<GeneratedBrief> {
  // TODO(M3): build lib/claude.ts via /claude-api skill (prompt caching, refusal
  // detection, fallback to MODELS.briefFallback, needs_review on double failure).
  throw new Error(
    `not implemented: generateBrief (M3) — will use ${MODELS.brief} at effort=${BRIEF_GENERATION.effort}`,
  );
}

async function storeIssue(_brief: GeneratedBrief): Promise<void> {
  // TODO(M3): insert into Supabase `issues` + `source_snapshots` (metadata only).
  throw new Error("not implemented: storeIssue (M3)");
}

async function main(): Promise<void> {
  console.log("[weekly-brief] pipeline starting");
  const raw = await collectSources();
  const inputs = await normalise(raw);
  const brief = await generateBrief(inputs);
  await storeIssue(brief);
  console.log(`[weekly-brief] stored issue "${brief.subject}" (status=${brief.status})`);
}

// Only run when executed directly (not when imported for types/tests).
if (require.main === module) {
  main().catch((err) => {
    console.error("[weekly-brief] pipeline failed:", err);
    process.exitCode = 1;
  });
}

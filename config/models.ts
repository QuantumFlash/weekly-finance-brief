/**
 * Model routing — single source of truth for which Claude model handles what.
 *
 * Policy (see CLAUDE.md "Model routing"):
 *  - brief:          weekly summarisation batch job only. Highest quality, high effort,
 *                    stable cached system prompt (prompts/fable-summariser.md).
 *  - briefFallback:  used when the brief job hits a refusal/safety limit or model
 *                    unavailability. Cheaper tier; output is marked needs_review.
 *  - interactive:    small, interactive, low-stakes tasks (subject-line variants,
 *                    admin summaries). Never used for the weekly brief itself.
 *
 * IDs verified against GET /v1/models with the project key on 2026-06-10:
 * claude-fable-5 (Claude Fable 5), claude-opus-4-8 (Claude Opus 4.8) both available.
 * Env-overridable, so any future change is a .env.local edit, not a code change.
 * Cost lever if interactive usage grows: drop interactive to claude-sonnet-4-6
 * or claude-haiku-4-5-20251001 (also verified available).
 */
export const MODELS = {
  brief: process.env.MODEL_BRIEF ?? "claude-fable-5",
  briefFallback: process.env.MODEL_BRIEF_FALLBACK ?? "claude-opus-4-8",
  interactive: process.env.MODEL_INTERACTIVE ?? "claude-opus-4-8",
} as const;

export const BRIEF_GENERATION = {
  /** Batch job: depth over latency. */
  effort: "high",
  /**
   * Bounded but not lowballed: adaptive-thinking tokens count toward output,
   * and truncation (stop_reason=max_tokens) in an unattended weekly job is a
   * worse failure mode than a few cents of headroom. Brief itself is ~1.5K tokens.
   */
  maxOutputTokens: 8000,
  /** One retry on fallback model, then mark needs_review and hold the send. */
  maxAttempts: 2,
  timeoutMs: 10 * 60_000,
} as const;

export const INTERACTIVE_GENERATION = {
  effort: "low",
  maxOutputTokens: 1000,
  timeoutMs: 60_000,
} as const;

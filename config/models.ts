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
 * TODO before first API call: verify exact model ID strings against current Anthropic
 * docs (run /claude-api when building lib/claude.ts). IDs are env-overridable so a
 * correction is a .env.local change, not a code change.
 */
export const MODELS = {
  brief: process.env.MODEL_BRIEF ?? "claude-fable-5",
  briefFallback: process.env.MODEL_BRIEF_FALLBACK ?? "claude-opus-4-5",
  interactive: process.env.MODEL_INTERACTIVE ?? "claude-opus-4-5",
} as const;

export const BRIEF_GENERATION = {
  /** Batch job: depth over latency. */
  effort: "high",
  /** Conservative cap — a brief is <= ~900 words plus structure. */
  maxOutputTokens: 4000,
  /** One retry on fallback model, then mark needs_review and hold the send. */
  maxAttempts: 2,
  timeoutMs: 10 * 60_000,
} as const;

export const INTERACTIVE_GENERATION = {
  effort: "low",
  maxOutputTokens: 1000,
  timeoutMs: 60_000,
} as const;

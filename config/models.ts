/**
 * Model routing — single source of truth.
 *
 * Backend: Claude Code CLI on the owner's subscription (see lib/claude.ts).
 * Values are CLI model aliases, env-overridable. Verified on this machine
 * 2026-06-10: `opus` -> claude-opus-4-6, `sonnet` -> claude-sonnet-4-6.
 *
 * Policy:
 *  - brief:         weekly summarisation job — best plan model (opus).
 *  - briefFallback: retry tier if the primary call fails — sonnet.
 *  - interactive:   small/low-stakes tasks (currently unused) — sonnet.
 *
 * If the project later returns to the metered Anthropic API (e.g. for
 * commercial scale), restore the SDK client from git history (commit 1527b1d)
 * and set these to API model IDs (claude-fable-5 was verified available).
 */
export const MODELS = {
  brief: process.env.MODEL_BRIEF ?? "opus",
  briefFallback: process.env.MODEL_BRIEF_FALLBACK ?? "sonnet",
  interactive: process.env.MODEL_INTERACTIVE ?? "sonnet",
} as const;

export const BRIEF_GENERATION = {
  /** Hard ceiling for one CLI generation (process killed beyond this). */
  timeoutMs: 10 * 60_000,
} as const;

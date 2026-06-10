import fs from "node:fs";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import { BRIEF_GENERATION, MODELS } from "../config/models";
import { env } from "./env";

/**
 * Claude client for the weekly brief (built per /claude-api guidance):
 * - claude-fable-5, output_config.effort=high, adaptive thinking
 *   (capabilities verified live via GET /v1/models/claude-fable-5:
 *   effort all-levels supported; thinking adaptive-only — never budget_tokens)
 * - streaming + finalMessage() so long generations can't hit HTTP timeouts
 * - stable system prompt loaded from prompts/fable-summariser.md with a
 *   cache_control breakpoint (helps fast retries; weekly cadence won't
 *   otherwise hit the cache TTL)
 * - refusal/truncation detection via stop_reason; one fallback attempt on
 *   MODELS.briefFallback so the brief still goes out (per spec); double
 *   failure -> needs_review (caller holds the send)
 * - logs token usage and stop reasons only — never key material
 */

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey() });
  }
  return client;
}

const PROMPT_MARKER =
  "## SYSTEM PROMPT — everything below this line is sent verbatim";

/** Loads the stable system prompt from prompts/fable-summariser.md. */
export function loadSummariserSystemPrompt(): string {
  const file = fs.readFileSync(
    path.join(process.cwd(), "prompts", "fable-summariser.md"),
    "utf8",
  );
  const idx = file.indexOf(PROMPT_MARKER);
  if (idx === -1) {
    throw new Error(
      "prompts/fable-summariser.md: system prompt marker not found",
    );
  }
  return file.slice(idx + PROMPT_MARKER.length).trim();
}

export interface BriefGenerationResult {
  text: string;
  model: string;
  status: "ok" | "needs_review";
  detail?: string;
}

async function callModel(
  model: string,
  system: string,
  userContent: string,
): Promise<Anthropic.Message> {
  return anthropic().messages
    .stream(
      {
        model,
        max_tokens: BRIEF_GENERATION.maxOutputTokens,
        output_config: { effort: BRIEF_GENERATION.effort },
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: system,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userContent }],
      },
      { timeout: BRIEF_GENERATION.timeoutMs },
    )
    .finalMessage();
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function describeOutcome(message: Anthropic.Message): string {
  const usage = message.usage;
  return `stop_reason=${message.stop_reason} input=${usage.input_tokens} output=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens ?? 0}`;
}

function isUsable(message: Anthropic.Message): boolean {
  return message.stop_reason === "end_turn" && textOf(message).length > 0;
}

/**
 * Generate the weekly brief with the fallback policy from CLAUDE.md.
 */
export async function generateBriefText(
  userContent: string,
): Promise<BriefGenerationResult> {
  const system = loadSummariserSystemPrompt();

  let primaryProblem: string;
  try {
    const primary = await callModel(MODELS.brief, system, userContent);
    console.log(`[claude] ${MODELS.brief}: ${describeOutcome(primary)}`);
    if (isUsable(primary)) {
      return { text: textOf(primary), model: MODELS.brief, status: "ok" };
    }
    primaryProblem = `unusable response (${describeOutcome(primary)})`;
  } catch (err) {
    primaryProblem =
      err instanceof Anthropic.APIError
        ? `API error ${err.status}: ${err.message}`
        : `error: ${(err as Error).message}`;
  }
  console.warn(
    `[claude] primary model failed (${primaryProblem}); trying fallback ${MODELS.briefFallback}`,
  );

  try {
    const fallback = await callModel(MODELS.briefFallback, system, userContent);
    console.log(
      `[claude] ${MODELS.briefFallback}: ${describeOutcome(fallback)}`,
    );
    if (isUsable(fallback)) {
      // Per spec: the brief still goes out on the fallback model.
      return {
        text: textOf(fallback),
        model: MODELS.briefFallback,
        status: "ok",
        detail: `primary failed: ${primaryProblem}`,
      };
    }
    return {
      text: textOf(fallback),
      model: MODELS.briefFallback,
      status: "needs_review",
      detail: `primary failed: ${primaryProblem}; fallback unusable (${describeOutcome(fallback)})`,
    };
  } catch (err) {
    const fallbackProblem =
      err instanceof Anthropic.APIError
        ? `API error ${err.status}: ${err.message}`
        : `error: ${(err as Error).message}`;
    return {
      text: "",
      model: MODELS.briefFallback,
      status: "needs_review",
      detail: `primary failed: ${primaryProblem}; fallback failed: ${fallbackProblem}`,
    };
  }
}

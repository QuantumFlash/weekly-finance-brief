import fs from "node:fs";
import path from "node:path";

import { BRIEF_GENERATION, MODELS } from "../config/models";
import { cliFallbackEnabled, runBriefViaCli } from "./claude";
import { geminiConfigured, geminiModelLadder, runBriefViaGemini } from "./gemini";

/**
 * Provider-agnostic brief generation with an ordered chain:
 *
 *   1. Gemini free tier (primary when GEMINI_API_KEY is set) — costs nothing,
 *      touches no Claude account. Tries each model in the ladder with up to
 *      ATTEMPTS_PER_MODEL attempts (backoff between retryable failures), so a
 *      transient 503 never escalates straight to the owner's subscription
 *      (observed: 3.5-flash "high demand" 503, 2026-06-10).
 *   2. Claude Code CLI (owner's subscription) — emergency fallback only;
 *      disable with BRIEF_FALLBACK_CLI=off.
 *   3. needs_review — caller stores the draft, alerts admin, holds the send.
 *
 * The pipeline only ever calls generateBriefText(); providers are plumbing.
 */

const ATTEMPTS_PER_MODEL = 2;
const RETRY_BACKOFF_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROMPT_MARKER =
  "## SYSTEM PROMPT — everything below this line is sent verbatim";

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

const OUTPUT_REMINDER =
  "IMPORTANT: Output ONLY the brief itself, starting with the `Subject:` line. No preamble, no commentary, no code fences.";

export async function generateBriefText(
  userContent: string,
): Promise<BriefGenerationResult> {
  const system = loadSummariserSystemPrompt();
  const user = `${userContent}\n\n${OUTPUT_REMINDER}`;
  const problems: string[] = [];

  // 1. Gemini (free tier) — primary: model ladder × bounded retries.
  if (geminiConfigured()) {
    gemini: for (const model of geminiModelLadder()) {
      for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
        const res = await runBriefViaGemini(
          model,
          system,
          user,
          BRIEF_GENERATION.timeoutMs,
        );
        console.log(`[generate] ${res.detail} (attempt ${attempt}/${ATTEMPTS_PER_MODEL})`);
        if (res.ok) {
          return { text: res.text, model, status: "ok" };
        }
        problems.push(res.detail);
        if (res.fatal) {
          // Credential-level failure: no Gemini model will work.
          break gemini;
        }
        if (!res.retryable) {
          // Model-specific rejection: skip retries, try the next model.
          break;
        }
        if (attempt < ATTEMPTS_PER_MODEL) {
          console.warn(`[generate] transient failure; retrying ${model} in ${RETRY_BACKOFF_MS / 1000}s`);
          await sleep(RETRY_BACKOFF_MS);
        }
      }
    }
  } else {
    problems.push("gemini skipped: GEMINI_API_KEY not set");
  }

  // 2. Claude CLI (subscription) — emergency fallback.
  if (cliFallbackEnabled()) {
    console.warn(
      `[generate] primary unavailable (${problems[problems.length - 1]}); falling back to subscription CLI`,
    );
    const res = await runBriefViaCli(
      system,
      user,
      MODELS.brief,
      BRIEF_GENERATION.timeoutMs,
    );
    console.log(`[generate] ${res.detail}`);
    if (res.ok) {
      return {
        text: res.text,
        model: `cli:${MODELS.brief}`,
        status: "ok",
        detail: problems.join("; "),
      };
    }
    problems.push(res.detail);
  } else {
    problems.push("cli fallback disabled (BRIEF_FALLBACK_CLI=off)");
  }

  // 3. Give up safely.
  return {
    text: "",
    model: "none",
    status: "needs_review",
    detail: problems.join("; "),
  };
}

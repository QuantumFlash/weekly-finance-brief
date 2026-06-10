import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { BRIEF_GENERATION, MODELS } from "../config/models";

/**
 * Claude generation backend: **Claude Code CLI** (`claude -p`), running on the
 * owner's existing Claude subscription (OAuth) — zero marginal cost.
 *
 * Why CLI instead of the metered Anthropic API: product decision 2026-06-10
 * ("build this fully free"). Same pattern as the jarvis service on this
 * machine. The git history contains the @anthropic-ai/sdk implementation if
 * the project later switches back to metered API for commercial scale.
 *
 * Posture note (documented in CLAUDE.md): subscription-backed generation is a
 * personal-use arrangement — fine while the sole subscriber is the owner.
 * Before taking external paying customers, flip to the metered API.
 *
 * Mechanics:
 * - prompt is delivered via stdin (no Windows arg-length limits)
 * - `--output-format json` gives { is_error, subtype, result, ... }
 * - ANTHROPIC_API_KEY is STRIPPED from the child env so the CLI always uses
 *   the logged-in subscription, never a metered (or empty-balance) API key
 * - same fallback policy as before: primary model -> fallback model ->
 *   needs_review (caller holds the send)
 */

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

interface CliResult {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  stop_reason?: string | null;
  modelUsage?: Record<string, unknown>;
}

function runClaudeCli(
  model: string,
  input: string,
  timeoutMs: number,
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    // The CLI must authenticate with the subscription OAuth session, never a
    // metered API key that may be present for other parts of the app.
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.ANTHROPIC_AUTH_TOKEN;

    const child = spawn(
      "claude",
      ["-p", "--output-format", "json", "--model", model],
      { shell: true, env: childEnv, windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // The JSON result is the last line of stdout (warnings may precede it).
      const jsonLine = stdout
        .split(/\r?\n/)
        .filter((l) => l.trim().startsWith("{"))
        .pop();
      if (!jsonLine) {
        reject(
          new Error(
            `claude CLI exited ${code} without JSON output${stderr ? `; stderr: ${stderr.slice(0, 300)}` : ""}`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(jsonLine) as CliResult);
      } catch {
        reject(new Error(`claude CLI returned unparseable JSON (exit ${code})`));
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

function usedModelName(res: CliResult, fallbackLabel: string): string {
  const keys = res.modelUsage ? Object.keys(res.modelUsage) : [];
  return keys[0] ?? fallbackLabel;
}

function buildCliInput(system: string, userContent: string): string {
  return [
    "<system_instructions>",
    system,
    "</system_instructions>",
    "",
    userContent,
    "",
    "IMPORTANT: Output ONLY the brief itself, starting with the `Subject:` line. No preamble, no commentary, no code fences.",
  ].join("\n");
}

function describeOutcome(res: CliResult): string {
  return `subtype=${res.subtype} is_error=${res.is_error} stop_reason=${res.stop_reason ?? "n/a"} chars=${res.result?.length ?? 0}`;
}

function isUsable(res: CliResult): boolean {
  return (
    res.is_error === false &&
    res.subtype === "success" &&
    typeof res.result === "string" &&
    res.result.trim().length > 0
  );
}

/**
 * Generate the weekly brief with the fallback policy from CLAUDE.md:
 * primary model -> fallback model -> needs_review (send held by caller).
 */
export async function generateBriefText(
  userContent: string,
): Promise<BriefGenerationResult> {
  const system = loadSummariserSystemPrompt();
  const input = buildCliInput(system, userContent);

  let primaryProblem: string;
  try {
    const primary = await runClaudeCli(
      MODELS.brief,
      input,
      BRIEF_GENERATION.timeoutMs,
    );
    console.log(`[claude] ${MODELS.brief}: ${describeOutcome(primary)}`);
    if (isUsable(primary)) {
      return {
        text: primary.result!.trim(),
        model: usedModelName(primary, MODELS.brief),
        status: "ok",
      };
    }
    primaryProblem = `unusable response (${describeOutcome(primary)})`;
  } catch (err) {
    primaryProblem = (err as Error).message;
  }
  console.warn(
    `[claude] primary model failed (${primaryProblem}); trying fallback ${MODELS.briefFallback}`,
  );

  try {
    const fallback = await runClaudeCli(
      MODELS.briefFallback,
      input,
      BRIEF_GENERATION.timeoutMs,
    );
    console.log(`[claude] ${MODELS.briefFallback}: ${describeOutcome(fallback)}`);
    if (isUsable(fallback)) {
      // Per spec: the brief still goes out on the fallback model.
      return {
        text: fallback.result!.trim(),
        model: usedModelName(fallback, MODELS.briefFallback),
        status: "ok",
        detail: `primary failed: ${primaryProblem}`,
      };
    }
    return {
      text: fallback.result?.trim() ?? "",
      model: usedModelName(fallback, MODELS.briefFallback),
      status: "needs_review",
      detail: `primary failed: ${primaryProblem}; fallback unusable (${describeOutcome(fallback)})`,
    };
  } catch (err) {
    return {
      text: "",
      model: MODELS.briefFallback,
      status: "needs_review",
      detail: `primary failed: ${primaryProblem}; fallback failed: ${(err as Error).message}`,
    };
  }
}

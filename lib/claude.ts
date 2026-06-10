import { spawn } from "node:child_process";

import type { ProviderResult } from "./gemini";

/**
 * Claude Code CLI provider (`claude -p`) — runs on the owner's subscription
 * OAuth. Since the Gemini free tier became the primary (2026-06-10, "don't
 * want to waste my credits"), this provider is the EMERGENCY FALLBACK only:
 * it is invoked solely when the primary fails, and can be disabled entirely
 * with BRIEF_FALLBACK_CLI=off.
 *
 * Mechanics: prompt via stdin (no arg-length limits), --output-format json,
 * ANTHROPIC_API_KEY stripped from the child env so the CLI always uses the
 * logged-in subscription, never a metered API key.
 */

interface CliResult {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  stop_reason?: string | null;
  modelUsage?: Record<string, unknown>;
}

export function cliFallbackEnabled(): boolean {
  return (process.env.BRIEF_FALLBACK_CLI ?? "on").toLowerCase() !== "off";
}

function runCli(model: string, input: string, timeoutMs: number): Promise<CliResult> {
  return new Promise((resolve, reject) => {
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

export async function runBriefViaCli(
  system: string,
  userContent: string,
  model: string,
  timeoutMs: number,
): Promise<ProviderResult> {
  const input = [
    "<system_instructions>",
    system,
    "</system_instructions>",
    "",
    userContent,
  ].join("\n");

  try {
    const res = await runCli(model, input, timeoutMs);
    const usedModel = res.modelUsage ? Object.keys(res.modelUsage)[0] : model;
    const detail = `cli ${usedModel} subtype=${res.subtype} is_error=${res.is_error} chars=${res.result?.length ?? 0}`;
    const ok =
      res.is_error === false &&
      res.subtype === "success" &&
      typeof res.result === "string" &&
      res.result.trim().length > 0;
    return { ok, text: res.result?.trim() ?? "", detail };
  } catch (err) {
    return { ok: false, text: "", detail: `cli error: ${(err as Error).message}` };
  }
}

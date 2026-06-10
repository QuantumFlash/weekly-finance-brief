/**
 * Gemini generation provider — Google AI Studio free tier.
 * Plain REST (no SDK dep): POST generateContent with a system instruction.
 * Used as the PRIMARY brief generator so the weekly job consumes no Claude
 * subscription usage and no paid credits anywhere.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export interface ProviderResult {
  ok: boolean;
  text: string;
  detail: string;
}

export async function runBriefViaGemini(
  system: string,
  userContent: string,
  timeoutMs: number,
): Promise<ProviderResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, text: "", detail: "GEMINI_API_KEY not set" };
  }
  const model = geminiModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userContent }] }],
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!res.ok) {
      const body = (await res.text()).slice(0, 400);
      return { ok: false, text: "", detail: `gemini ${model} HTTP ${res.status}: ${body}` };
    }

    const json = (await res.json()) as GeminiResponse;
    const candidate = json.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    const finish = candidate?.finishReason ?? "unknown";
    const blocked = json.promptFeedback?.blockReason;

    if (blocked) {
      return { ok: false, text: "", detail: `gemini blocked: ${blocked}` };
    }
    if (!text) {
      return { ok: false, text: "", detail: `gemini empty response (finish=${finish})` };
    }
    if (finish !== "STOP" && finish !== "stop") {
      return { ok: false, text, detail: `gemini abnormal finish: ${finish}` };
    }
    return { ok: true, text, detail: `gemini ${model} finish=${finish} chars=${text.length}` };
  } catch (err) {
    return {
      ok: false,
      text: "",
      detail: `gemini error: ${(err as Error).name === "AbortError" ? `timeout after ${timeoutMs}ms` : (err as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

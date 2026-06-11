/**
 * Social studio — turns the latest brief into a platform-tailored content pack:
 * per-network text posts + a branded image-card spec. Saves a markdown pack to
 * social-packs/<week>.md and a card HTML to social-packs/<week>-card.html
 * (render the card to PNG separately).
 *
 * Run: node --env-file=.env.local --import=tsx scripts/generateSocialPack.ts
 *
 * Uses a delimited-section output format (not JSON) so multi-paragraph posts
 * with newlines/quotes parse reliably.
 */
import fs from "node:fs";
import path from "node:path";

import { supabaseAdmin } from "../lib/supabase/admin";

const SOCIAL_SYSTEM = `You are the social media manager for "Weekly Finance Brief", a weekly markets newsletter for busy NON-EXPERT retail investors (site: weeklyfinancebrief.com; free 7-day trial, then EUR5/month).

From the week's brief, write promotional social posts that drive newsletter signups. Hard rules:
- NO financial advice, NO buy/sell calls, NO predictions. Educational / orientation framing only.
- Plain English, hook-first, honest, accurate to the brief's facts. No hype. At most 1-2 tasteful emoji.
- Make the value clear: "the week in markets in 5 minutes, for people who aren't finance pros."
- Soft CTA to weeklyfinancebrief.com (free week).

Output EXACTLY this template, with each section after its marker line. Do not add anything else:

===X_POST===
(one standalone tweet, <=270 chars)
===X_THREAD===
(tweet 1 — the hook)
~~~
(tweet 2)
~~~
(tweet 3)
~~~
(tweet 4 — the CTA)
===LINKEDIN===
(a short professional post, 3-5 short paragraphs)
===INSTAGRAM===
(an Instagram/Facebook caption, punchy, a few line breaks, then 3-5 hashtags)
===TIKTOK===
(a 20-30s spoken script: hook first line, 2-3 beats, CTA)
===CARD_HEADLINE===
(<=8 words: the single most shareable line or stat from this week)
===CARD_SUBLINE===
(<=14 words of supporting context)`;

interface Pack {
  xPost: string;
  xThread: string[];
  linkedin: string;
  instagram: string;
  tiktok: string;
  cardHeadline: string;
  cardSubline: string;
}

function parseSections(text: string): Pack {
  const sections: Record<string, string> = {};
  const parts = text.split(/^===([A-Z_]+)===\s*$/m);
  // parts: [pre, NAME1, body1, NAME2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    sections[parts[i]] = (parts[i + 1] ?? "").trim();
  }
  const need = (k: string) => {
    if (!sections[k]) throw new Error(`social output missing section: ${k}`);
    return sections[k];
  };
  return {
    xPost: need("X_POST"),
    xThread: need("X_THREAD")
      .split(/^~~~\s*$/m)
      .map((t) => t.trim())
      .filter(Boolean),
    linkedin: need("LINKEDIN"),
    instagram: need("INSTAGRAM"),
    tiktok: need("TIKTOK"),
    cardHeadline: need("CARD_HEADLINE"),
    cardSubline: need("CARD_SUBLINE"),
  };
}

async function gemini(system: string, user: string): Promise<Pack> {
  const key = process.env.GEMINI_API_KEY!;
  const models = [process.env.GEMINI_MODEL ?? "gemini-3.5-flash", "gemini-2.5-flash"];
  let lastErr = "";
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 6000 },
            }),
          },
        );
        if (!res.ok) {
          lastErr = `HTTP ${res.status}`;
          if (res.status >= 500 || res.status === 429) {
            await new Promise((r) => setTimeout(r, 8000));
            continue;
          }
          throw new Error(`gemini ${model} ${lastErr}`);
        }
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        console.log(`[social] generated with ${model} (${text.length} chars)`);
        return parseSections(text);
      } catch (err) {
        lastErr = (err as Error).message;
        if (attempt === 2 && model === models[models.length - 1]) throw err;
      }
    }
  }
  throw new Error(`gemini: all attempts failed (${lastErr})`);
}

function cardHtml(headline: string, subline: string, weekLabel: string): string {
  const esc = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{width:1080px;height:1080px;background:#09090b;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden;}
.glow{position:absolute;width:1080px;height:1080px;background:radial-gradient(620px circle at 25% 20%,rgba(16,185,129,0.20),transparent 55%),radial-gradient(720px circle at 85% 88%,rgba(16,185,129,0.10),transparent 60%);}
.wrap{position:relative;padding:96px 90px;height:1080px;display:flex;flex-direction:column;justify-content:space-between;}
.brand{display:flex;align-items:center;gap:18px;}
.dot{width:22px;height:22px;border-radius:50%;background:#34d399;box-shadow:0 0 28px rgba(52,211,153,0.9);}
.brandtxt{color:#fafafa;font-size:36px;font-weight:600;letter-spacing:-0.5px;}
.tag{color:#71717a;font-size:30px;font-weight:500;margin-top:8px;}
h1{color:#fafafa;font-size:92px;line-height:1.05;font-weight:600;letter-spacing:-2.5px;max-width:900px;}
.accent{background:linear-gradient(90deg,#34d399,#10b981);-webkit-background-clip:text;background-clip:text;color:transparent;}
.sub{color:#a1a1aa;font-size:40px;line-height:1.4;margin-top:34px;max-width:860px;font-weight:400;}
.foot{display:flex;align-items:center;justify-content:space-between;}
.badge{display:inline-block;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.10);color:#6ee7b7;font-size:30px;font-weight:600;padding:16px 32px;border-radius:999px;}
.url{color:#71717a;font-size:32px;font-weight:500;}
</style></head><body><div class="glow"></div><div class="wrap">
<div><div class="brand"><div class="dot"></div><div class="brandtxt">Weekly Finance Brief</div></div><div class="tag">${esc(weekLabel)} &middot; the week in markets</div></div>
<div><h1><span class="accent">${esc(headline)}</span></h1><div class="sub">${esc(subline)}</div></div>
<div class="foot"><span class="badge">Read it in 5 minutes &middot; free week</span><span class="url">weeklyfinancebrief.com</span></div>
</div></body></html>`;
}

async function main() {
  const { data: issue, error } = await supabaseAdmin()
    .from("issues")
    .select("week_label, subject, body_markdown")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !issue) throw new Error(`no issue: ${error?.message}`);

  const pack = await gemini(
    SOCIAL_SYSTEM,
    `Week: ${issue.week_label}\nSubject: ${issue.subject}\n\n${issue.body_markdown}`,
  );

  const dir = path.join(process.cwd(), "social-packs");
  fs.mkdirSync(dir, { recursive: true });

  const md = [
    `# Social pack — ${issue.week_label}`,
    `*${issue.subject}*`,
    "",
    "## X / Twitter — single post",
    pack.xPost,
    "",
    "## X / Twitter — thread",
    ...pack.xThread.map((t, i) => `**${i + 1}.** ${t}`),
    "",
    "## LinkedIn",
    pack.linkedin,
    "",
    "## Instagram / Facebook",
    pack.instagram,
    "",
    "## TikTok / Reels — script",
    pack.tiktok,
    "",
    "## Image card (rendered to " + `${issue.week_label}-card.png` + ")",
    `**${pack.cardHeadline}** — ${pack.cardSubline}`,
    "",
    "---",
    "Generated by the social studio. Review, then schedule in Metricool/Publer.",
  ].join("\n");
  fs.writeFileSync(path.join(dir, `${issue.week_label}.md`), md, "utf8");
  fs.writeFileSync(
    path.join(dir, `${issue.week_label}-card.html`),
    cardHtml(pack.cardHeadline, pack.cardSubline, issue.week_label),
    "utf8",
  );
  console.log(`[social] pack written: social-packs/${issue.week_label}.md`);
  console.log(`[social] card: "${pack.cardHeadline}"`);
}

void main();

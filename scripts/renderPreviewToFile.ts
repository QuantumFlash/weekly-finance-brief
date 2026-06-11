/**
 * One-off: render the latest issue with the email template to an HTML file
 * for visual inspection. Run:
 *   node --env-file=.env.local --import=tsx scripts/renderPreviewToFile.ts <outpath>
 */
import fs from "node:fs";

import { renderBrief } from "../lib/renderBrief";
import { supabaseAdmin } from "../lib/supabase/admin";

async function main() {
  const out = process.argv[2] ?? "email-preview.html";
  const { data: issue, error } = await supabaseAdmin()
    .from("issues")
    .select("week_label, body_markdown, sent_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !issue) throw new Error(`no issue: ${error?.message}`);

  const rendered = renderBrief(issue.body_markdown, {
    weekLabel: issue.week_label,
    dateLabel: new Date(issue.sent_at ?? Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    archiveUrl: `https://weeklyfinancebrief.com/issues/${issue.week_label}`,
    unsubscribeUrl: "https://weeklyfinancebrief.com/api/unsubscribe?email=demo&token=demo",
  });
  fs.writeFileSync(out, rendered.html, "utf8");
  console.log(`wrote ${out}`);
}

void main();

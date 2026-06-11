/**
 * Renders the model's strict-markdown brief into email HTML + plain text.
 * The format contract lives in prompts/fable-summariser.md:
 *   Subject: <line>
 *   ## What happened this week / ## Why it matters / ## What to watch next
 *   ## Glossary (optional)
 * No markdown dependency: the contract is narrow (headings, bullets,
 * paragraphs, **bold**), so a small deterministic converter is safer.
 */

export interface ParsedBrief {
  subject: string;
  /** Markdown body without the Subject line. */
  markdown: string;
}

export function parseBrief(raw: string): ParsedBrief {
  const text = raw.trim();
  const match = text.match(/^Subject:\s*(.+)$/m);
  if (!match) {
    throw new Error("Brief is missing the required `Subject:` line");
  }
  const subject = match[1].trim();
  // Robustness across backends: drop anything before the Subject line
  // (e.g. an assistant preamble), then remove the Subject line itself.
  const fromSubject = text.slice(match.index ?? 0);
  const markdown = fromSubject.replace(/^Subject:\s*.+$/m, "").trim();
  if (!/^## What happened this week/m.test(markdown)) {
    throw new Error("Brief is missing the `## What happened this week` section");
  }
  return { subject, markdown };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(value: string): string {
  // Only **bold** is allowed inline by the prompt contract.
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

const STYLES = {
  body: "margin:0;padding:0;background-color:#fafafa;",
  container:
    "max-width:600px;margin:0 auto;padding:32px 24px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;",
  brand:
    "font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#71717a;margin:0 0 24px;",
  h2: "font-size:18px;line-height:1.4;margin:28px 0 12px;color:#18181b;",
  p: "font-size:15px;line-height:1.7;margin:0 0 14px;color:#3f3f46;",
  ul: "padding-left:20px;margin:0 0 14px;",
  li: "font-size:15px;line-height:1.7;margin:0 0 8px;color:#3f3f46;",
  footer:
    "margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#a1a1aa;",
} as const;

export interface RenderedBrief {
  html: string;
  text: string;
}

/**
 * Converts brief markdown to inline-styled HTML (no document shell).
 * Shared by the email template and the web archive pages.
 */
export function briefBodyHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      htmlParts.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      closeList();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeList();
      htmlParts.push(`<h2 style="${STYLES.h2}">${inline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("- ")) {
      if (!listOpen) {
        htmlParts.push(`<ul style="${STYLES.ul}">`);
        listOpen = true;
      }
      htmlParts.push(`<li style="${STYLES.li}">${inline(trimmed.slice(2))}</li>`);
    } else {
      closeList();
      htmlParts.push(`<p style="${STYLES.p}">${inline(trimmed)}</p>`);
    }
  }
  closeList();
  return htmlParts.join("\n");
}

export function renderBrief(
  markdown: string,
  options: { weekLabel: string; archiveUrl?: string; unsubscribeUrl?: string },
): RenderedBrief {
  const htmlParts = [briefBodyHtml(markdown)];

  const archiveLine = options.archiveUrl
    ? `Read on the web: ${escapeHtml(options.archiveUrl)} · `
    : "";

  const unsubLine = options.unsubscribeUrl
    ? `<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#a1a1aa;">Unsubscribe</a>`
    : "Manage your subscription from your account page.";

  const html = [
    `<!DOCTYPE html><html><body style="${STYLES.body}">`,
    `<div style="${STYLES.container}">`,
    `<p style="${STYLES.brand}">Weekly Finance Brief · ${escapeHtml(options.weekLabel)}</p>`,
    ...htmlParts,
    `<div style="${STYLES.footer}">`,
    `<p style="margin:0 0 6px;">${archiveLine}${unsubLine}</p>`,
    `<p style="margin:0;">Educational information only — not investment advice, and never a recommendation to buy or sell anything.</p>`,
    "</div></div></body></html>",
  ].join("\n");

  const textParts = [
    `WEEKLY FINANCE BRIEF · ${options.weekLabel}`,
    "",
    markdown,
    "",
    "--",
  ];
  if (options.archiveUrl) textParts.push(`Read on the web: ${options.archiveUrl}`);
  if (options.unsubscribeUrl)
    textParts.push(`Unsubscribe: ${options.unsubscribeUrl}`);
  textParts.push("Educational information only — not investment advice.");

  return { html, text: textParts.join("\n") };
}

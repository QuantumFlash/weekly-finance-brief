/**
 * Renders the model's strict-markdown brief into a polished HTML email + plain text.
 * The format contract lives in prompts/fable-summariser.md:
 *   Subject: <line>
 *   ## What happened this week / ## Why it matters / ## What to watch next
 *   ## Glossary (optional)
 *
 * Email HTML is table-based and inline-styled for maximum client compatibility
 * (Gmail, Apple Mail, Outlook). No markdown dependency: the contract is narrow
 * (headings, bullets, paragraphs, **bold**, [S1] source refs).
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

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Inline formatting: bold (figures) + muted source references like [I1][S2]. */
function inline(value: string): string {
  let s = escapeHtml(value);
  s = s.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong style="color:#0f172a;font-weight:700;">$1</strong>',
  );
  s = s.replace(
    /\[([A-Z]\d+)\]/g,
    '<span style="color:#94a3b8;font-size:12px;font-weight:500;">[$1]</span>',
  );
  return s;
}

// --- Web archive renderer (plain inline styles, no shell) ---

const WEB = {
  h2: "font-size:18px;line-height:1.4;margin:28px 0 12px;color:#18181b;",
  p: "font-size:15px;line-height:1.7;margin:0 0 14px;color:#3f3f46;",
  ul: "padding-left:20px;margin:0 0 14px;",
  li: "font-size:15px;line-height:1.7;margin:0 0 8px;color:#3f3f46;",
} as const;

/** Web archive body (consumed by /issues/[week]). */
export function briefBodyHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (t.startsWith("## ")) {
      closeList();
      out.push(`<h2 style="${WEB.h2}">${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith("- ")) {
      if (!listOpen) {
        out.push(`<ul style="${WEB.ul}">`);
        listOpen = true;
      }
      out.push(`<li style="${WEB.li}">${inline(t.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p style="${WEB.p}">${inline(t)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

// --- Email renderer (table-based, branded shell) ---

const EMAIL = {
  h2:
    "font-size:16px;line-height:1.4;font-weight:700;color:#0f172a;" +
    "margin:30px 0 14px;padding-bottom:8px;border-bottom:2px solid #d1fae5;",
  p: `font-size:15px;line-height:1.75;color:#3f3f46;margin:0 0 16px;font-family:${FONT};`,
  ul: "margin:0 0 18px;padding-left:22px;",
  li: `font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 11px;font-family:${FONT};`,
} as const;

function emailBodyHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (t.startsWith("## ")) {
      closeList();
      out.push(`<h2 style="${EMAIL.h2}">${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith("- ")) {
      if (!listOpen) {
        out.push(`<ul style="${EMAIL.ul}">`);
        listOpen = true;
      }
      out.push(`<li style="${EMAIL.li}">${inline(t.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p style="${EMAIL.p}">${inline(t)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export interface RenderedBrief {
  html: string;
  text: string;
}

export function renderBrief(
  markdown: string,
  options: {
    weekLabel: string;
    dateLabel?: string;
    archiveUrl?: string;
    unsubscribeUrl?: string;
  },
): RenderedBrief {
  const body = emailBodyHtml(markdown);
  const meta = [options.dateLabel, "5 min read"].filter(Boolean).join(" · ");

  const link = "color:#059669;text-decoration:none;font-weight:600;";
  const footerLinks: string[] = [];
  if (options.archiveUrl) {
    footerLinks.push(
      `<a href="${escapeHtml(options.archiveUrl)}" style="${link}">Read on the web</a>`,
    );
  }
  // NOTE: keep href as the first attribute on this anchor — sendIssue.ts swaps
  // the placeholder for a per-recipient token via regex before sending.
  if (options.unsubscribeUrl) {
    footerLinks.push(
      `<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>`,
    );
  } else {
    footerLinks.push(
      `<span style="color:#94a3b8;">Manage your subscription in your account</span>`,
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Weekly Finance Brief · ${escapeHtml(options.weekLabel)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">What happened, why it matters, and what to watch next — your five-minute read.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
<tr><td style="background-color:#0f172a;padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:${FONT};color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.2px;"><span style="color:#34d399;">&#9679;</span>&nbsp;&nbsp;Weekly Finance Brief</td>
<td align="right" style="font-family:${FONT};color:#94a3b8;font-size:13px;font-weight:500;">${escapeHtml(options.weekLabel)}</td>
</tr></table>
</td></tr>
${meta ? `<tr><td style="padding:22px 32px 0;"><p style="margin:0;font-family:${FONT};color:#64748b;font-size:13px;">${escapeHtml(meta)}</p></td></tr>` : ""}
<tr><td style="padding:6px 32px 10px;">
${body}
</td></tr>
<tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 32px;">
<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;">${footerLinks.join('<span style="color:#cbd5e1;"> &nbsp;·&nbsp; </span>')}</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:#94a3b8;">Educational information only — not investment advice, and never a recommendation to buy or sell anything.</p>
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr>
<td align="center" style="padding:16px 12px 0;font-family:${FONT};color:#cbd5e1;font-size:11px;">Weekly Finance Brief · weeklyfinancebrief.com</td>
</tr></table>
</td></tr>
</table>
</body></html>`;

  const textParts = [
    `WEEKLY FINANCE BRIEF · ${options.weekLabel}`,
    meta,
    "",
    markdown,
    "",
    "--",
  ].filter((l) => l !== undefined);
  if (options.archiveUrl) textParts.push(`Read on the web: ${options.archiveUrl}`);
  if (options.unsubscribeUrl)
    textParts.push(`Unsubscribe: ${options.unsubscribeUrl}`);
  textParts.push("Educational information only — not investment advice.");

  return { html, text: textParts.join("\n") };
}

import Parser from "rss-parser";

import {
  FRED_SERIES,
  MAX_HEADLINE_ITEMS,
  MAX_OFFICIAL_ITEMS,
  RSS_FEEDS,
  WINDOW_DAYS,
} from "../config/sources";
import { env } from "./env";

/** Shapes match the input contract in prompts/fable-summariser.md. */
export interface OfficialSummary {
  id: string;
  title: string;
  source: string;
  date: string;
  excerpt: string;
  url?: string;
}

export interface CommentaryHeadline {
  id: string;
  headline: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
}

export interface Indicator {
  id: string;
  name: string;
  series: string;
  latest: number;
  previous: number;
  unit: string;
  period: string;
}

export interface BriefInputs {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  officialSummaries: OfficialSummary[];
  commentaryHeadlines: CommentaryHeadline[];
  indicators: Indicator[];
  /** Non-fatal collection problems, surfaced in run logs. */
  warnings: string[];
}

/** ISO week label like 2026-W24 (the product's issue key). */
export function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredSeries(
  series: string,
  name: string,
  unit: string,
  index: number,
): Promise<Indicator | null> {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", series);
  url.searchParams.set("api_key", env.fredApiKey());
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "40");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FRED ${series}: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { observations?: FredObservation[] };
  const valid = (json.observations ?? []).filter((o) => o.value !== ".");
  if (valid.length === 0) {
    return null;
  }

  const latest = valid[0];
  // "Previous" = first valid observation >= 6 days older than the latest:
  // gives week-over-week deltas for daily series and month-over-month for
  // monthly series with one rule.
  const latestTime = new Date(latest.date).getTime();
  const previous =
    valid.find(
      (o) => latestTime - new Date(o.date).getTime() >= 6 * 86400000,
    ) ?? valid[Math.min(1, valid.length - 1)];

  return {
    id: `I${index + 1}`,
    name,
    series,
    latest: Number(latest.value),
    previous: Number(previous.value),
    unit,
    period: `${previous.date} -> ${latest.date}`,
  };
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

/**
 * Collect everything the prompt needs from allowlisted sources only.
 * Individual source failures are warnings, never fatal — a thin week's brief
 * honestly says it's thin (the prompt is built for that).
 */
export async function collectBriefInputs(now = new Date()): Promise<BriefInputs> {
  const warnings: string[] = [];
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86400000);

  // --- Indicators (FRED) ---
  const indicators: Indicator[] = [];
  for (const [i, cfg] of FRED_SERIES.entries()) {
    try {
      const indicator = await fetchFredSeries(cfg.series, cfg.name, cfg.unit, i);
      if (indicator) {
        indicators.push(indicator);
      } else {
        warnings.push(`FRED ${cfg.series}: no valid observations`);
      }
    } catch (err) {
      warnings.push((err as Error).message);
    }
  }

  // --- Official summaries + headlines (allowlisted RSS) ---
  const parser = new Parser({
    timeout: 20000,
    headers: {
      // Polite, identifiable agent (some gov sites block generic agents).
      "User-Agent": "WeeklyFinanceBrief/1.0 (contact: abeckfriis2002@gmail.com)",
    },
  });
  const officialSummaries: OfficialSummary[] = [];
  const commentaryHeadlines: CommentaryHeadline[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items ?? []) {
        const pub = item.pubDate ? new Date(item.pubDate) : null;
        if (!pub || Number.isNaN(pub.getTime()) || pub < windowStart || pub > now) {
          continue;
        }
        const title = item.title?.trim();
        if (!title) {
          continue;
        }
        const snippet = truncate(item.contentSnippet ?? item.content ?? "", 300);
        const date = pub.toISOString().slice(0, 10);
        if (feed.kind === "official") {
          officialSummaries.push({
            id: `S${officialSummaries.length + 1}`,
            title,
            source: feed.source,
            date,
            excerpt: snippet,
            url: item.link ?? undefined,
          });
        } else {
          commentaryHeadlines.push({
            id: `H${commentaryHeadlines.length + 1}`,
            headline: title,
            source: feed.source,
            date,
            snippet,
            url: item.link ?? undefined,
          });
        }
      }
    } catch (err) {
      warnings.push(`feed ${feed.url}: ${(err as Error).message}`);
    }
  }

  return {
    weekLabel: isoWeekLabel(now),
    weekStart: windowStart.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
    officialSummaries: officialSummaries.slice(0, MAX_OFFICIAL_ITEMS),
    commentaryHeadlines: commentaryHeadlines.slice(0, MAX_HEADLINE_ITEMS),
    indicators,
    warnings,
  };
}

/** Build the volatile user message exactly per the prompt's input contract. */
export function buildUserMessage(inputs: BriefInputs): string {
  return [
    `Week covered: ${inputs.weekStart} to ${inputs.weekEnd} (issue ${inputs.weekLabel}).`,
    "",
    "<official_summaries>",
    JSON.stringify(
      inputs.officialSummaries.map(({ url: _url, ...rest }) => rest),
      null,
      2,
    ),
    "</official_summaries>",
    "",
    "<commentary_headlines>",
    JSON.stringify(
      inputs.commentaryHeadlines.map(({ url: _url, ...rest }) => rest),
      null,
      2,
    ),
    "</commentary_headlines>",
    "",
    "<indicators>",
    JSON.stringify(inputs.indicators, null, 2),
    "</indicators>",
    "",
    "Write this week's brief now, following your output format exactly.",
  ].join("\n");
}

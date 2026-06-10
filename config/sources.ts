/**
 * Source ALLOWLIST — the pipeline may only read what is listed here.
 * Policy (CLAUDE.md): FRED series, official/public macro & policy sources.
 * Adding a source = adding it here, deliberately, with a comment.
 */

export interface FredSeriesConfig {
  /** FRED series id */
  series: string;
  /** Human name used in the brief */
  name: string;
  unit: string;
}

/** Core weekly indicator set (all FRED, all public). */
export const FRED_SERIES: FredSeriesConfig[] = [
  { series: "SP500", name: "S&P 500 index", unit: "index points" },
  { series: "DGS10", name: "US 10-year Treasury yield", unit: "% p.a." },
  { series: "FEDFUNDS", name: "Effective federal funds rate", unit: "% p.a." },
  { series: "UNRATE", name: "US unemployment rate", unit: "%" },
  {
    series: "CPIAUCSL",
    name: "US CPI (all items, seasonally adjusted)",
    unit: "index 1982-84=100",
  },
];

export interface FeedConfig {
  url: string;
  source: string;
  /** Which prompt block items from this feed belong to. */
  kind: "official" | "headline";
}

/**
 * Official RSS feeds. Each fetch is individually fault-tolerant: a dead or
 * renamed feed is logged and skipped, never fatal — so candidates may sit
 * here even if occasionally unavailable.
 */
export const RSS_FEEDS: FeedConfig[] = [
  {
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    source: "US Federal Reserve (monetary policy press releases)",
    kind: "official",
  },
  {
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    source: "US Federal Reserve (all press releases)",
    kind: "official",
  },
  {
    url: "https://www.federalreserve.gov/feeds/speeches.xml",
    source: "US Federal Reserve (speeches & testimony)",
    kind: "headline",
  },
  {
    url: "https://www.bls.gov/feed/news_release.rss",
    source: "US Bureau of Labor Statistics (news releases)",
    kind: "official",
  },
];

/** Items older than this many days are out of scope for the weekly brief. */
export const WINDOW_DAYS = 8;

/** Caps keep the prompt compact and the job cheap. */
export const MAX_OFFICIAL_ITEMS = 12;
export const MAX_HEADLINE_ITEMS = 12;

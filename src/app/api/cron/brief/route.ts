/**
 * POST /api/cron/brief — CRON_SECRET-protected no-op ack endpoint.
 *
 * On Vercel (deployed): GitHub Actions runs the pipeline script directly
 * (with secrets as env vars) — it does NOT hit this endpoint. The endpoint
 * exists as a health-check / manual-trigger hook for external cron services
 * (cron-job.org etc.) that want to confirm the server is reachable.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *       or ?secret=<CRON_SECRET>
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : query;
  return provided === expected;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    message:
      "Server is reachable. Pipeline runs via GitHub Actions — see .github/workflows/daily-brief.yml.",
    ts: new Date().toISOString(),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}

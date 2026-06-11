/**
 * Simple in-memory rate limiter — good enough for low-traffic MVP.
 * Resets on process restart (cold start). Upgrade to Redis/Upstash if
 * traffic warrants it, but this stops casual abuse without any extra deps.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries periodically so the Map doesn't grow forever.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  },
  5 * 60_000,
).unref();

/**
 * Returns true if the request is within the rate limit, false if it should
 * be rejected. `key` should include both the endpoint name and the
 * client's IP (e.g. "signup:1.2.3.4").
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

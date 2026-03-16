// In-memory rate limiter (per-process; resets on deploy)
// Book ref: Chapter "API Security" — rate limiting as defense against brute-force

const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits) {
    if (val.resetAt <= now) hits.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request should be BLOCKED.
 * @param key   unique identifier (e.g. IP + endpoint)
 * @param limit max requests per window
 * @param windowMs window size in milliseconds (default 60s)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

/**
 * Tiny in-memory rate limiter. Per-process, so a single Coolify app
 * container is fine — if we ever scale to multiple instances this needs to
 * move to Redis / Upstash.
 *
 * Pattern: fixed window. `rateLimit("foo", 5, 60_000)` allows 5 calls keyed
 * on "foo" per 60 seconds. Returns { ok: false, retryAfterMs } when the
 * caller has exhausted their quota for the current window.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count++;
  return { ok: true };
}

/**
 * Best-effort client IP. Reads X-Forwarded-For (set by the host nginx in
 * front of Coolify) and falls back to X-Real-IP. Never throws.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Lightweight in-memory rate limiter (per IP).
 * Good enough for small/medium sites. For production at scale, swap with Redis.
 */

export function createRateLimiter({ limitPerMinute = 15 } = {}) {
  const hits = new Map();

  const windowMs = 60_000;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, bucket] of hits.entries()) {
      if (now - bucket.startedAt > windowMs) hits.delete(key);
    }
  };

  return function chatbotRateLimiter(req, res, next) {
    cleanup();

    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const bucket = hits.get(key) || { count: 0, startedAt: now };

    if (now - bucket.startedAt > windowMs) {
      bucket.count = 0;
      bucket.startedAt = now;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > limitPerMinute) {
      return res.status(429).json({
        success: false,
        message: "Too many chat requests. Please wait a minute and try again.",
      });
    }

    return next();
  };
}

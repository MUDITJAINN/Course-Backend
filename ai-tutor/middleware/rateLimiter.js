const buckets = new Map();

export function createRateLimiter(maxPerMinute = 20) {
  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = 60_000;

    let entry = buckets.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      buckets.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > maxPerMinute) {
      return res.status(429).json({
        success: false,
        message: "Too many tutor requests. Please wait a minute.",
      });
    }

    next();
  };
}

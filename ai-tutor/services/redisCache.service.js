/**
 * Redis — cache semantic search (RAG) results per question + resource.
 * Use Upstash free tier: REDIS_URL=rediss://...
 */

import { createHash } from "crypto";

let redisClient = null;

async function getRedis(url) {
  if (!url) return null;
  if (redisClient) return redisClient;

  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, { maxRetriesPerRequest: 2 });
    return redisClient;
  } catch (err) {
    console.warn("[ai-tutor] Redis unavailable:", err.message);
    return null;
  }
}

function cacheKey(resourceType, resourceId, query) {
  const hash = createHash("sha256").update(query.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `rag:${resourceType}:${resourceId}:${hash}`;
}

export async function getCachedRagResult(config, resourceType, resourceId, query) {
  const client = await getRedis(config.redisUrl);
  if (!client) return null;

  try {
    const raw = await client.get(cacheKey(resourceType, resourceId, query));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedRagResult(
  config,
  resourceType,
  resourceId,
  query,
  payload,
  ttlSeconds = 600
) {
  const client = await getRedis(config.redisUrl);
  if (!client) return;

  try {
    await client.setex(
      cacheKey(resourceType, resourceId, query),
      ttlSeconds,
      JSON.stringify(payload)
    );
  } catch (err) {
    console.warn("[ai-tutor] Redis set failed:", err.message);
  }
}

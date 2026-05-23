/**
 * Qdrant vector store — scalable ANN search (free cloud tier available).
 * https://cloud.qdrant.io — 1GB free cluster
 */

function headers(apiKey) {
  const h = { "Content-Type": "application/json" };
  if (apiKey) h["api-key"] = apiKey;
  return h;
}

export async function ensureQdrantCollection({ url, apiKey, collection, vectorSize }) {
  const base = `${url}/collections/${collection}`;
  const existing = await fetch(base, { headers: headers(apiKey) });
  if (existing.ok) return;

  const create = await fetch(base, {
    method: "PUT",
    headers: headers(apiKey),
    body: JSON.stringify({
      vectors: { size: vectorSize, distance: "Cosine" },
    }),
  });

  if (!create.ok) {
    const err = await create.json().catch(() => ({}));
    throw new Error(err?.status?.error || `Qdrant create collection failed (${create.status})`);
  }
}

function resourceFilter(resourceType, resourceId) {
  return {
    must: [
      { key: "resourceType", match: { value: resourceType } },
      { key: "resourceId", match: { value: String(resourceId) } },
    ],
  };
}

export async function deleteQdrantByResource({ url, apiKey, collection, resourceType, resourceId }) {
  const res = await fetch(`${url}/collections/${collection}/points/delete`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ filter: resourceFilter(resourceType, resourceId) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.status?.error || `Qdrant delete failed (${res.status})`);
  }
}

export async function upsertQdrantPoints({ url, apiKey, collection, points }) {
  if (!points.length) return;

  const res = await fetch(`${url}/collections/${collection}/points`, {
    method: "PUT",
    headers: headers(apiKey),
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.status?.error || `Qdrant upsert failed (${res.status})`);
  }
}

export async function searchQdrant({
  url,
  apiKey,
  collection,
  vector,
  resourceType,
  resourceId,
  topK,
}) {
  const res = await fetch(`${url}/collections/${collection}/points/search`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      vector,
      limit: topK,
      with_payload: true,
      filter: resourceFilter(resourceType, resourceId),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.status?.error || `Qdrant search failed (${res.status})`);
  }

  return (data.result || []).map((hit) => ({
    score: hit.score ?? 0,
    text: hit.payload?.text || "",
    lectureTitle: hit.payload?.lectureTitle || "",
    chunkIndex: hit.payload?.chunkIndex ?? 0,
    chunkId: hit.payload?.chunkId || "",
  }));
}

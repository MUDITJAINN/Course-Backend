/**
 * Weaviate — vector database for semantic search (RAG).
 * Free sandbox: https://weaviate.io → Weaviate Cloud
 * Self-host: docker run -p 8080:8080 semitechnologies/weaviate:latest
 */

function weaviateHeaders(apiKey) {
  const h = { "Content-Type": "application/json" };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

export async function ensureWeaviateClass(config, vectorSize) {
  const className = config.weaviateClass;
  const check = await fetch(`${config.weaviateUrl}/v1/schema/${className}`, {
    headers: weaviateHeaders(config.weaviateApiKey),
  });

  if (check.ok) return;

  const create = await fetch(`${config.weaviateUrl}/v1/schema`, {
    method: "POST",
    headers: weaviateHeaders(config.weaviateApiKey),
    body: JSON.stringify({
      class: className,
      vectorizer: "none",
      vectorIndexConfig: { distance: "cosine" },
      properties: [
        { name: "text", dataType: ["text"] },
        { name: "pdf", dataType: ["text"] },
        { name: "page", dataType: ["int"] },
        { name: "resourceType", dataType: ["text"] },
        { name: "resourceId", dataType: ["text"] },
        { name: "lectureTitle", dataType: ["text"] },
        { name: "chunkIndex", dataType: ["int"] },
        { name: "chunkId", dataType: ["text"] },
      ],
    }),
  });

  if (!create.ok) {
    const err = await create.json().catch(() => ({}));
    throw new Error(err?.error?.[0]?.message || `Weaviate schema failed (${create.status})`);
  }
}

export async function deleteWeaviateByResource(config, resourceType, resourceId) {
  const res = await fetch(`${config.weaviateUrl}/v1/batch/objects`, {
    method: "DELETE",
    headers: weaviateHeaders(config.weaviateApiKey),
    body: JSON.stringify({
      match: {
        class: config.weaviateClass,
        where: {
          operator: "And",
          operands: [
            {
              path: ["resourceType"],
              operator: "Equal",
              valueText: resourceType,
            },
            {
              path: ["resourceId"],
              operator: "Equal",
              valueText: String(resourceId),
            },
          ],
        },
      },
    }),
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.[0]?.message || `Weaviate delete failed (${res.status})`);
  }
}

export async function upsertWeaviateObjects(config, objects) {
  if (!objects.length) return;

  await ensureWeaviateClass(config, objects[0].vector?.length || 768);

  const res = await fetch(`${config.weaviateUrl}/v1/batch/objects`, {
    method: "POST",
    headers: weaviateHeaders(config.weaviateApiKey),
    body: JSON.stringify({
      objects: objects.map((obj) => ({
        class: config.weaviateClass,
        id: obj.id,
        properties: obj.properties,
        vector: obj.vector,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.[0]?.message || `Weaviate upsert failed (${res.status})`);
  }
}

export async function searchWeaviate({
  config,
  vector,
  resourceType,
  resourceId,
  topK,
}) {
  const query = {
    query: `{ 
      Get {
        ${config.weaviateClass}(
          limit: ${topK}
          nearVector: { vector: ${JSON.stringify(vector)} }
          where: {
            operator: And
            operands: [
              { path: ["resourceType"], operator: Equal, valueText: "${resourceType}" }
              { path: ["resourceId"], operator: Equal, valueText: "${String(resourceId)}" }
            ]
          }
        ) {
          text
          pdf
          page
          lectureTitle
          chunkIndex
          _additional { certainty distance }
        }
      }
    }`,
  };

  const res = await fetch(`${config.weaviateUrl}/v1/graphql`, {
    method: "POST",
    headers: weaviateHeaders(config.weaviateApiKey),
    body: JSON.stringify(query),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) {
    throw new Error(
      data.errors?.[0]?.message || `Weaviate search failed (${res.status})`
    );
  }

  const rows = data?.data?.Get?.[config.weaviateClass] || [];

  return rows.map((row) => ({
    score: row._additional?.certainty ?? 1 - (row._additional?.distance ?? 1),
    text: row.text || "",
    lectureTitle: row.lectureTitle || "",
    chunkIndex: row.chunkIndex ?? 0,
    page: row.page ?? null,
    pdf: row.pdf || "",
  }));
}

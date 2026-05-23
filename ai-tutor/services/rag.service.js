import { createEmbedding } from "./embedding.service.js";
import { createVectorStore } from "./vectorStore/index.js";
import { getCachedRagResult, setCachedRagResult } from "./redisCache.service.js";

export async function retrieveTutorContext({
  resourceType,
  resourceId,
  query,
  config,
  topK = 6,
  maxContextChars = 10000,
  pdfFilename = "",
}) {
  const cached = await getCachedRagResult(config, resourceType, resourceId, query);
  if (cached?.contextText !== undefined) {
    return { ...cached, fromCache: true };
  }

  const store = createVectorStore(config);
  const queryVector = await createEmbedding(config, query);

  const { hits, chunkCount } = await store.search(
    resourceType,
    resourceId,
    queryVector,
    topK,
    pdfFilename
  );

  if (!hits.length) {
    const empty = { contextText: "", sources: [], chunkCount, vectorStore: store.provider };
    return empty;
  }

  const sources = [];
  const parts = [];
  let totalChars = 0;

  for (const item of hits) {
    const pageHint = item.page ? ` | page ${item.page}` : "";
    const pdfHint = item.pdf ? ` | ${item.pdf}` : "";

    const block = [
      `[Section: ${item.lectureTitle} | chunk ${item.chunkIndex + 1}${pageHint}${pdfHint} | score ${item.score.toFixed(3)}]`,
      item.text,
    ].join("\n");

    if (totalChars + block.length > maxContextChars) break;
    parts.push(block);
    totalChars += block.length;
    sources.push({
      lectureTitle: item.lectureTitle,
      chunkIndex: item.chunkIndex,
      page: item.page,
      pdf: item.pdf,
      score: item.score,
    });
  }

  const result = {
    contextText: parts.join("\n\n---\n\n"),
    sources,
    chunkCount,
    vectorStore: store.provider,
    semanticSearch: true,
  };

  await setCachedRagResult(config, resourceType, resourceId, query, result, config.redisTtlSeconds);

  return result;
}

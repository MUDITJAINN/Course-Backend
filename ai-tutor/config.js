const toBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

export function loadTutorConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };

  const r2AccountId = (env.R2_ACCOUNT_ID || "").trim();

  return {
    enabled: toBool(env.TUTOR_ENABLED, false),

    /** local | r2 — where full note PDFs are read during reindex */
    pdfStorage: (env.PDF_STORAGE || "local").toLowerCase().trim(),
    r2AccountId,
    r2AccessKeyId: (env.R2_ACCESS_KEY_ID || "").trim(),
    r2SecretAccessKey: (env.R2_SECRET_ACCESS_KEY || "").trim(),
    r2Bucket: (env.R2_BUCKET || "course-notes").trim(),
    r2Endpoint:
      (env.R2_ENDPOINT || "").trim() ||
      (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : ""),

    ollamaUrl: (env.TUTOR_OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, ""),

    llmBaseUrl: (env.TUTOR_LLM_BASE_URL || "http://localhost:11434/v1").replace(/\/+$/, ""),
    llmApiKey: (env.TUTOR_LLM_API_KEY || env.CHATBOT_API_KEY || "").trim(),
    llmModel: (env.TUTOR_LLM_MODEL || "llama3.2").trim(),

    embedModel: (env.TUTOR_EMBED_MODEL || "jina-embeddings-v3").trim(),

    routePath: (env.TUTOR_ROUTE_PATH || "/api/v1/tutor").trim(),

    chunkSize: toInt(env.TUTOR_CHUNK_SIZE, 900),
    chunkOverlap: toInt(env.TUTOR_CHUNK_OVERLAP, 120),
    topK: toInt(env.TUTOR_RAG_TOP_K, 6),
    maxContextChars: toInt(env.TUTOR_MAX_CONTEXT_CHARS, 10000),
    maxHistoryTurns: toInt(env.TUTOR_MAX_HISTORY_TURNS, 6),
    maxTokens: toInt(env.TUTOR_MAX_TOKENS, 900),
    temperature: Number(env.TUTOR_TEMPERATURE ?? 0.3),
    rateLimitPerMinute: toInt(env.TUTOR_RATE_LIMIT_PER_MIN, 20),

    /** mongodb (dev) | weaviate (recommended prod) | qdrant (alt) */
    vectorStore: (env.TUTOR_VECTOR_STORE || "mongodb").toLowerCase().trim(),

    weaviateUrl: (env.WEAVIATE_URL || "http://localhost:8080").replace(/\/+$/, ""),
    weaviateApiKey: (env.WEAVIATE_API_KEY || "").trim(),
    weaviateClass: (env.WEAVIATE_CLASS || "TutorChunk").trim(),

    qdrantUrl: (env.QDRANT_URL || "").replace(/\/+$/, ""),
    qdrantApiKey: (env.QDRANT_API_KEY || "").trim(),
    qdrantCollection: (env.QDRANT_COLLECTION || "tutor_chunks").trim(),

    /** jina | ollama | openai — embeddings provider */
    embedProvider: (env.TUTOR_EMBED_PROVIDER || "jina").toLowerCase().trim(),
    embedBaseUrl: (env.TUTOR_EMBED_BASE_URL || "https://api.jina.ai/v1").replace(/\/+$/, ""),
    embedApiKey: (env.TUTOR_EMBED_API_KEY || env.JINA_API_KEY || "").trim(),

    /** Upstash Redis — semantic search result cache */
    redisUrl: (env.REDIS_URL || "").trim(),
    redisTtlSeconds: toInt(env.REDIS_RAG_TTL_SECONDS, 600),
  };
}

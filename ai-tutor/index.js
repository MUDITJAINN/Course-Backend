/**
 * AI Course Tutor — Ollama + RAG (Level 3)
 *
 *   import { mountAiTutor } from "./ai-tutor/index.js";
 *   mountAiTutor(app);
 *
 * Env: TUTOR_ENABLED=true, TUTOR_OLLAMA_URL=http://localhost:11434
 * Pull models: ollama pull llama3.2 && ollama pull nomic-embed-text
 */

import { loadTutorConfig } from "./config.js";
import { createTutorController } from "./controllers/tutor.controller.js";
import { createTutorAdminController } from "./controllers/tutorAdmin.controller.js";
import { createTutorRouter } from "./routes/tutor.routes.js";

export { loadTutorConfig } from "./config.js";

export function mountAiTutor(app, options = {}) {
  const config = loadTutorConfig(options.configOverrides || {});

  if (!config.enabled) {
    console.log("[ai-tutor] Disabled (set TUTOR_ENABLED=true to enable)");
    return { enabled: false, config };
  }

  if (config.vectorStore === "qdrant" && !config.qdrantUrl) {
    console.warn("[ai-tutor] TUTOR_VECTOR_STORE=qdrant but QDRANT_URL missing — fallback mongodb");
    config.vectorStore = "mongodb";
  }
  if (config.vectorStore === "chroma") {
    console.warn("[ai-tutor] Chroma not used — switching to TUTOR_VECTOR_STORE=weaviate");
    config.vectorStore = "weaviate";
  }
  if (config.vectorStore === "weaviate" && !config.weaviateUrl) {
    console.warn("[ai-tutor] TUTOR_VECTOR_STORE=weaviate but WEAVIATE_URL missing — fallback mongodb");
    config.vectorStore = "mongodb";
  }
  if (config.embedProvider === "jina" && !config.embedApiKey) {
    console.warn("[ai-tutor] TUTOR_EMBED_PROVIDER=jina but TUTOR_EMBED_API_KEY missing");
  }

  const tutorController = createTutorController({ config });
  const adminController = createTutorAdminController({ config });

  const router = createTutorRouter({
    tutorController,
    adminController,
    rateLimitPerMinute: config.rateLimitPerMinute,
  });

  app.use(config.routePath, router);
  console.log(`[ai-tutor] Mounted at ${config.routePath} (Ollama RAG)`);

  return { enabled: true, config, router };
}

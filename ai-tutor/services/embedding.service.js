/**
 * Embeddings — Jina (production), Ollama (local dev), or any OpenAI-compatible API.
 */

export async function createEmbedding(config, text) {
  const provider = config.embedProvider;

  if (provider === "ollama") {
    return createOllamaEmbedding(config, text);
  }

  // jina | openai | together — OpenAI-compatible /v1/embeddings
  return createOpenAiCompatibleEmbedding(config, text);
}

async function createOllamaEmbedding(config, text) {
  const response = await fetch(`${config.ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.embedModel, prompt: text }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Ollama embedding failed (${response.status})`);
  }

  const vector = data?.embedding;
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error("Ollama returned an empty embedding vector.");
  }
  return vector;
}

async function createOpenAiCompatibleEmbedding(config, text) {
  const base = config.embedBaseUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  if (config.embedApiKey) headers.Authorization = `Bearer ${config.embedApiKey}`;

  const response = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.embedModel,
      input: text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Embedding API failed (${response.status})`);
  }

  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error("Embedding API returned an empty vector.");
  }
  return vector;
}

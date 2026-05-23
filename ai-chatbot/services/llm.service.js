/**
 * LLM SERVICE — talks to Groq / OpenAI (OpenAI-compatible HTTP API)
 * -----------------------------------------------------------------
 * Term — LLM: Large Language Model (Groq hosts fast inference for models like Llama).
 * Term — Prompt: text we send; "system" prompt = rules + your site knowledge.
 * Term — Completion: model generating the assistant reply.
 */

/**
 * Non-streaming: wait for full answer, then return one string.
 */
export async function createChatCompletion({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens = 700,
  temperature = 0.4,
}) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage =
      data?.error?.message || data?.message || `LLM request failed (${response.status})`;
    throw new Error(providerMessage);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("LLM returned an empty response.");
  }

  return reply;
}

/**
 * STREAMING — Term — SSE (Server-Sent Events): server pushes many small chunks over one HTTP response.
 * Term — Async generator (function*): yields tokens one-by-one; caller uses for await (...).
 */
export async function* streamChatCompletion({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens = 700,
  temperature = 0.4,
}) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `LLM stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.replace(/^data:\s*/, "");
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload);
        const token = json?.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

/** System prompt = instructions + your website knowledge (RAG-lite at Level 2) */
export function buildSystemPrompt({ siteName, knowledgeText, memorySummary }) {
  const memoryBlock = memorySummary
    ? `\nConversation memory (short summary):\n${memorySummary}\n`
    : "";

  return [
    `You are a helpful assistant for the website "${siteName}".`,
    "Answer ONLY using the website knowledge below and general guidance about navigating the site.",
    "If the answer is not in the knowledge base, say you do not have that information and suggest Contact or Services pages.",
    "Never invent course prices, refund rules, or policies. Be concise, friendly, and use markdown bullet lists when helpful.",
    "Do not reveal API keys, internal URLs, or server implementation details.",
    memoryBlock,
    "=== WEBSITE KNOWLEDGE (source of truth) ===",
    knowledgeText,
    "=== END WEBSITE KNOWLEDGE ===",
  ].join("\n");
}

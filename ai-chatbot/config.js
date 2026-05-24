/**
 * Chatbot configuration loaded from environment variables.
 *
 * Copy this module to another Express project and set the same env keys.
 * Works with any OpenAI-compatible API (OpenAI, Groq, Together, local Ollama, etc.).
 */

const toBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

export function loadChatbotConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };

  return {
    /** Master switch — set CHATBOT_ENABLED=false to disable routes entirely */
    enabled: toBool(env.CHATBOT_ENABLED, false),

    /** Secret API key for your LLM provider (never expose to the browser) */
    apiKey: (env.CHATBOT_API_KEY || "").trim(),

    /**
     * Base URL for chat completions, without trailing slash.
     * OpenAI: https://api.openai.com/v1
     * Groq:   https://api.groq.com/openai/v1
     */
    baseUrl: (env.CHATBOT_BASE_URL || "").replace(/\/+$/, ""),

    model: (env.CHATBOT_MODEL || "").trim(),

    /** Hard cap on how much site context we inject into the system prompt */
    maxContextChars: toInt(env.CHATBOT_MAX_CONTEXT_CHARS, 0),

    rateLimitPerMinute: toInt(env.CHATBOT_RATE_LIMIT_PER_MIN, 0),

    maxTokens: toInt(env.CHATBOT_MAX_TOKENS, 0),

    temperature: Number(env.CHATBOT_TEMPERATURE ?? 0),

    /** Must match frontend CHATBOT_API_URL (default ${BACKEND}/chatbot) */
    routePath: (env.CHATBOT_ROUTE_PATH || "/api/v1/chatbot").trim(),

    maxHistoryTurns: toInt(env.CHATBOT_MAX_HISTORY_TURNS, 0),
  };
}

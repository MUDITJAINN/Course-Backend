/**
 * AI Chatbot module — backend entry point
 * =======================================
 *
 * Usage in any Express app:
 *
 *   import { mountChatbot } from "./ai-chatbot/index.js";
 *   import { Course } from "./models/course.model.js";
 *
 *   mountChatbot(app, {
 *     siteName: "My Store",
 *     fetchCourses: async () => Course.find().select("title description price").lean(),
 *   });
 *
 * Required env: CHATBOT_ENABLED=true, CHATBOT_API_KEY=sk-...
 * Optional: CHATBOT_BASE_URL, CHATBOT_MODEL, CHATBOT_ROUTE_PATH
 */

import { loadChatbotConfig } from "./config.js";
import { createChatbotController } from "./controllers/chatbot.controller.js";
import { createChatbotRouter } from "./routes/chatbot.routes.js";
import { getSiteKnowledge } from "./content/siteKnowledge.js";

export { loadChatbotConfig } from "./config.js";
export { getSiteKnowledge } from "./content/siteKnowledge.js";

/**
 * Mounts chatbot routes on the given Express app.
 *
 * @param {import('express').Express} app
 * @param {object} options
 * @param {string} options.siteName — shown in system prompt
 * @param {Function} [options.fetchCourses] — return catalog for context
 * @param {Function} [options.fetchNotes] — return catalog for context
 * @param {Function|string} [options.staticKnowledge] — override default site text
 * @param {object} [options.configOverrides] — override env for tests
 */
export function mountChatbot(app, options = {}) {
  const config = loadChatbotConfig(options.configOverrides || {});

  if (!config.enabled) {
    console.log("[ai-chatbot] Disabled (set CHATBOT_ENABLED=true to enable)");
    return { enabled: false, config };
  }

  const controller = createChatbotController({
    config,
    siteName: options.siteName || "Website",
    fetchCourses: options.fetchCourses,
    fetchNotes: options.fetchNotes,
    staticKnowledge: options.staticKnowledge || getSiteKnowledge,
  });

  const router = createChatbotRouter({
    controller,
    rateLimitPerMinute: config.rateLimitPerMinute,
  });

  app.use(config.routePath, router);
  console.log(`[ai-chatbot] Mounted at ${config.routePath}`);

  return { enabled: true, config, router };
}

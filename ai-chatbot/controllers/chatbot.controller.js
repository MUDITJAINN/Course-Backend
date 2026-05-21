import { chatRequestSchema } from "../validators/chat.validator.js";
import { buildKnowledgeContext } from "../services/context.service.js";
import {
  buildSystemPrompt,
  createChatCompletion,
  streamChatCompletion,
} from "../services/llm.service.js";
import {
  resolveSession,
  loadSessionMessages,
  saveSessionMessage,
  createNewSession,
  updateSessionMemory,
} from "../services/session.service.js";
/**
 * CONTROLLER — connects HTTP requests to services (Level 2 pattern).
 * Term — req: incoming request object (body, cookies, user id from middleware).
 * Term — res: outgoing response object (json, cookies, SSE stream).
 */
export function createChatbotController(deps) {
  const { config, siteName, fetchCourses, fetchNotes, staticKnowledge } = deps;

  async function buildMessagesForLlm(session, userMessage) {
    const knowledgeText = await buildKnowledgeContext({
      fetchCourses,
      fetchNotes,
      staticKnowledge,
      maxContextChars: config.maxContextChars,
    });

    const systemPrompt = buildSystemPrompt({
      siteName,
      knowledgeText,
      memorySummary: session.memorySummary || "",
    });

    const dbHistory = await loadSessionMessages(
      session._id,
      config.maxHistoryTurns * 2
    );

    return [
      { role: "system", content: systemPrompt },
      ...dbHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];
  }

  /** GET /session — load or create session + message history from MongoDB */
  async function getSession(req, res) {
    try {
      const session = await resolveSession(req, res, req.userId);
      const messages = await loadSessionMessages(session._id, 50);

      return res.json({
        success: true,
        sessionId: String(session._id),
        messages,
        userId: req.userId || null,
      });
    } catch (error) {
      console.error("[ai-chatbot] getSession", error.message);
      return res.status(500).json({ success: false, message: "Could not load session" });
    }
  }

  /** POST /session/new — clear thread: new session document */
  async function postNewSession(req, res) {
    try {
      const session = await createNewSession(res, req.userId);
      return res.json({
        success: true,
        sessionId: String(session._id),
        messages: [],
      });
    } catch (error) {
      console.error("[ai-chatbot] postNewSession", error.message);
      return res.status(500).json({ success: false, message: "Could not start new chat" });
    }
  }

  /** POST /chat — non-streaming fallback (still saves to DB) */
  async function postChat(req, res) {
    try {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors?.[0]?.message || "Invalid request",
        });
      }

      const { message } = parsed.data;
      const session = await resolveSession(req, res, req.userId);

      const messages = await buildMessagesForLlm(session, message);

      const reply = await createChatCompletion({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        messages,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });

      await saveSessionMessage(session._id, "user", message);
      await saveSessionMessage(session._id, "assistant", reply);
      await updateSessionMemory(session._id, message, reply);

      return res.json({
        success: true,
        reply,
        sessionId: String(session._id),
      });
    } catch (error) {
      console.error("[ai-chatbot] postChat", error.message);
      return res.status(500).json({
        success: false,
        message: error.message?.includes("CHATBOT_API_KEY")
          ? "Chatbot is not configured on the server."
          : "Sorry, the assistant could not respond right now.",
      });
    }
  }

  /**
   * POST /chat/stream — Level 2 streaming via SSE.
   * Browser receives many events: { type: 'token', content: '...' } then { type: 'done' }.
   */
  async function postChatStream(req, res) {
    try {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors?.[0]?.message || "Invalid request",
        });
      }

      const { message } = parsed.data;
      const session = await resolveSession(req, res, req.userId);

      const llmMessages = await buildMessagesForLlm(session, message);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let fullReply = "";

      for await (const token of streamChatCompletion({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        messages: llmMessages,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      })) {
        fullReply += token;
        res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
      }

      await saveSessionMessage(session._id, "user", message);
      await saveSessionMessage(session._id, "assistant", fullReply);
      await updateSessionMemory(session._id, message, fullReply);

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          sessionId: String(session._id),
        })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error("[ai-chatbot] postChatStream", error.message);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: error.message });
      }
      res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
      res.end();
    }
  }

  function getStatus(req, res) {
    return res.json({
      success: true,
      enabled: config.enabled,
      configured: Boolean(config.apiKey),
      model: config.model,
      level: 2,
      features: ["sessions", "mongodb", "streaming", "optional-auth", "memory-summary"],
    });
  }

  return {
    getStatus,
    getSession,
    postNewSession,
    postChat,
    postChatStream,
  };
}

import { Course } from "../../models/course.model.js";
import { Note } from "../../models/note.model.js";
import { CourseLecture } from "../../models/courseLecture.model.js";
import { CourseChunk } from "../../models/courseChunk.model.js";
import { tutorChatSchema } from "../validators/tutor.validator.js";
import { retrieveTutorContext } from "../services/rag.service.js";
import { buildTutorSystemPrompt } from "../services/llm.service.js";
import {
  getOrCreateTutorSession,
  loadTutorMessages,
  saveTutorMessage,
  resetTutorSession,
} from "../services/session.service.js";
import { streamChatCompletion } from "../../ai-chatbot/services/llm.service.js";
import { lectureFilter, chunkFilter, TUTOR_RESOURCE } from "../utils/tutorResource.js";

export function createTutorController({ config }) {
  async function getStatus(req, res) {
    return res.json({
      success: true,
      enabled: config.enabled,
      llmModel: config.llmModel,
      embedModel: config.embedModel,
      ollamaUrl: config.ollamaUrl,
      vectorStore: config.vectorStore,
      llmProvider: config.llmApiKey ? "openai-compatible" : "ollama-local",
      level: ["weaviate", "qdrant"].includes(config.vectorStore) ? 4 : 3,
      resources: ["notes", "courses"],
      embedProvider: config.embedProvider,
      pdfStorage: config.pdfStorage,
      redis: Boolean(config.redisUrl),
      features: [
        "rag",
        "semantic-search",
        "notes",
        "courses",
        "purchase-gated",
        "streaming",
        "pdf-ingest",
        "r2-pdf",
        "jina-embeddings",
        `${config.vectorStore}-vectors`,
        config.redisUrl ? "redis-cache" : null,
      ].filter(Boolean),
    });
  }

  function makeGetLectures(resourceType) {
    return async (req, res) => {
      try {
        const resourceId = req.tutorResourceId;
        const lectures = await CourseLecture.find(lectureFilter(resourceType, resourceId))
          .select("title order durationMinutes videoUrl createdAt")
          .sort({ order: 1, createdAt: 1 })
          .lean();

        const chunkCount = await CourseChunk.countDocuments(
          chunkFilter(resourceType, resourceId)
        );

        return res.json({
          success: true,
          resourceType,
          lectures,
          indexedChunks: chunkCount,
        });
      } catch (error) {
        console.error("[ai-tutor] getLectures", error.message);
        return res.status(500).json({ success: false, message: "Could not load sections" });
      }
    };
  }

  function makeGetSession(resourceType) {
    return async (req, res) => {
      try {
        const session = await getOrCreateTutorSession(
          req.userId,
          resourceType,
          req.tutorResourceId
        );
        const messages = await loadTutorMessages(session._id, 50);
        return res.json({
          success: true,
          sessionId: String(session._id),
          messages,
        });
      } catch (error) {
        console.error("[ai-tutor] getSession", error.message);
        return res.status(500).json({ success: false, message: "Could not load tutor session" });
      }
    };
  }

  function makePostNewSession(resourceType) {
    return async (req, res) => {
      try {
        const session = await resetTutorSession(
          req.userId,
          resourceType,
          req.tutorResourceId
        );
        return res.json({
          success: true,
          sessionId: String(session._id),
          messages: [],
        });
      } catch (error) {
        console.error("[ai-tutor] postNewSession", error.message);
        return res.status(500).json({ success: false, message: "Could not reset session" });
      }
    };
  }

  async function loadResource(resourceType, resourceId) {
    if (resourceType === TUTOR_RESOURCE.NOTE) {
      return Note.findById(resourceId).select("title description pages downloadFileUrl").lean();
    }
    return Course.findById(resourceId).select("title description").lean();
  }

  function pdfBasename(resource) {
    const url = resource?.downloadFileUrl || "";
    return url.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
  }

  async function buildLlmMessages({ resourceType, resource, session, userMessage }) {
    const { contextText, sources } = await retrieveTutorContext({
      resourceType,
      resourceId: resource._id,
      query: userMessage,
      config,
      topK: config.topK,
      maxContextChars: config.maxContextChars,
      pdfFilename: pdfBasename(resource),
    });

    const chunkCount = await CourseChunk.countDocuments(
      chunkFilter(resourceType, resource._id)
    );

    const systemPrompt = buildTutorSystemPrompt({
      resourceType,
      title: resource.title,
      ragContext: contextText,
      sources,
      hasIndexedChunks: chunkCount > 0,
    });

    const history = await loadTutorMessages(session._id, config.maxHistoryTurns * 2);

    return [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];
  }

  function makePostChatStream(resourceType) {
    return async (req, res) => {
      try {
        const parsed = tutorChatSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            message: parsed.error.errors?.[0]?.message || "Invalid message",
          });
        }

        const { message } = parsed.data;
        const resourceId = req.tutorResourceId;

        const resource = await loadResource(resourceType, resourceId);
        if (!resource) {
          return res.status(404).json({
            success: false,
            message: resourceType === TUTOR_RESOURCE.NOTE ? "Note not found" : "Course not found",
          });
        }

        const session = await getOrCreateTutorSession(req.userId, resourceType, resourceId);
        const llmMessages = await buildLlmMessages({
          resourceType,
          resource,
          session,
          userMessage: message,
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        let fullReply = "";

        for await (const token of streamChatCompletion({
          apiKey: config.llmApiKey,
          baseUrl: config.llmBaseUrl,
          model: config.llmModel,
          messages: llmMessages,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        })) {
          fullReply += token;
          res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
        }

        await saveTutorMessage(session._id, "user", message);
        await saveTutorMessage(session._id, "assistant", fullReply);

        res.write(
          `data: ${JSON.stringify({
            type: "done",
            sessionId: String(session._id),
          })}\n\n`
        );
        res.end();
      } catch (error) {
        console.error("[ai-tutor] postChatStream", error.message);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: error.message?.includes("Ollama")
              ? error.message
              : "AI tutor could not respond. Check Ollama is running and models are pulled.",
          });
        }
        res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
        res.end();
      }
    };
  }

  return {
    getStatus,
    getCourseLectures: makeGetLectures(TUTOR_RESOURCE.COURSE),
    getNoteLectures: makeGetLectures(TUTOR_RESOURCE.NOTE),
    getCourseSession: makeGetSession(TUTOR_RESOURCE.COURSE),
    getNoteSession: makeGetSession(TUTOR_RESOURCE.NOTE),
    postCourseNewSession: makePostNewSession(TUTOR_RESOURCE.COURSE),
    postNoteNewSession: makePostNewSession(TUTOR_RESOURCE.NOTE),
    postCourseChatStream: makePostChatStream(TUTOR_RESOURCE.COURSE),
    postNoteChatStream: makePostChatStream(TUTOR_RESOURCE.NOTE),
  };
}

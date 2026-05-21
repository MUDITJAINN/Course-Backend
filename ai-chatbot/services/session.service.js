/**
 * SESSION SERVICE — database operations for Level 2 chatbot
 * -------------------------------------------------------
 * Term — Service layer: business logic separated from HTTP (controller) and routes.
 */

import crypto from "crypto";
import { ChatSession } from "../models/chatSession.model.js";
import { ChatMessage } from "../models/chatMessage.model.js";

const SESSION_COOKIE = "chat_session";

/** Cookie options: httpOnly = browser JS cannot read it (safer) */
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Term — UUID: random unique id (here we use MongoDB _id instead after create).
 * Finds existing session or creates a new one; sets cookie on response.
 */
export async function resolveSession(req, res, userId) {
  const cookieId = req.cookies?.[SESSION_COOKIE];
  const bodyId = req.body?.sessionId || req.query?.sessionId;
  const candidateId = bodyId || cookieId;

  if (candidateId) {
    const existing = await ChatSession.findById(candidateId);
    if (existing && userCanAccessSession(existing, userId, cookieId)) {
      await linkSessionToUserIfNeeded(existing, userId);
      res.cookie(SESSION_COOKIE, String(existing._id), sessionCookieOptions());
      return existing;
    }
  }

  const session = await ChatSession.create({ userId: userId || null });
  res.cookie(SESSION_COOKIE, String(session._id), sessionCookieOptions());
  return session;
}

/** Security: logged-in user owns session OR guest cookie matches anonymous session */
function userCanAccessSession(session, userId, cookieId) {
  if (userId && session.userId && String(session.userId) === String(userId)) {
    return true;
  }
  if (!session.userId && cookieId && String(session._id) === String(cookieId)) {
    return true;
  }
  if (userId && !session.userId) {
    return true;
  }
  return false;
}

async function linkSessionToUserIfNeeded(session, userId) {
  if (userId && !session.userId) {
    session.userId = userId;
    await session.save();
  }
}

/** Load recent messages from MongoDB (newest last for the LLM) */
export async function loadSessionMessages(sessionId, limit = 20) {
  const rows = await ChatMessage.find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  return rows.map((m) => ({ role: m.role, content: m.content }));
}

/** Persist one message bubble */
export async function saveSessionMessage(sessionId, role, content) {
  return ChatMessage.create({ sessionId, role, content });
}

/** Start a fresh conversation thread */
export async function createNewSession(res, userId) {
  const session = await ChatSession.create({ userId: userId || null });
  res.cookie(SESSION_COOKIE, String(session._id), sessionCookieOptions());
  return session;
}

/**
 * Simple "memory": keep a short summary on the session document.
 * Term — Truncate: cut text to max length so we don't bloat the DB.
 */
export async function updateSessionMemory(sessionId, lastUserMessage, lastAssistantReply) {
  const summary = `User asked about: ${lastUserMessage.slice(0, 120)}. Assistant replied: ${lastAssistantReply.slice(0, 200)}`;
  await ChatSession.findByIdAndUpdate(sessionId, { memorySummary: summary.slice(0, 500) });
}

export { SESSION_COOKIE };

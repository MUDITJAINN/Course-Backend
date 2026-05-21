import { z } from "zod";

/**
 * Term — Zod: library that validates request JSON shape before we touch the database/LLM.
 */

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  sessionId: z.string().optional(),
  history: z.array(historyMessageSchema).max(20).optional().default([]),
});

export const sessionQuerySchema = z.object({
  sessionId: z.string().optional(),
});

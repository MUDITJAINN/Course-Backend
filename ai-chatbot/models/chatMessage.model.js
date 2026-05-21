/**
 * CHAT MESSAGE MODEL
 * ------------------
 * Each row = one bubble (user question or assistant answer).
 * Linked to a session via sessionId (foreign key / reference).
 */

import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    // OpenAI/Groq use roles: system | user | assistant
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

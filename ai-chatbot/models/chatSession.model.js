/**
 * CHAT SESSION MODEL (MongoDB + Mongoose)
 * ---------------------------------------
 * Term — Session: one conversation thread (like one WhatsApp chat).
 * Term — Schema: blueprint for documents stored in a MongoDB collection.
 * Term — Model: class that reads/writes those documents (ChatSession.find, .create).
 */

import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    // If user is logged in, we attach their User id so history follows the account
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Short label shown in a future "history list" UI (optional Level 2+ feature)
    title: { type: String, default: "New chat" },

    /**
     * Term — Memory (simple form): one-line summary of the chat so far.
     * Real products use embeddings/vector DB (Level 4); we store a text snippet.
     */
    memorySummary: { type: String, default: "" },
  },
  {
    // timestamps: true adds createdAt + updatedAt automatically
    timestamps: true,
  }
);

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

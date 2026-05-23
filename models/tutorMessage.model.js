import mongoose from "mongoose";

const tutorMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Types.ObjectId,
      ref: "TutorSession",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const TutorMessage = mongoose.model("TutorMessage", tutorMessageSchema);

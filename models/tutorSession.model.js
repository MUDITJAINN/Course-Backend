import mongoose from "mongoose";

const tutorSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["course", "note"],
      default: "course",
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    noteId: {
      type: mongoose.Types.ObjectId,
      ref: "Note",
      index: true,
    },
    title: { type: String, default: "AI Tutor chat" },
  },
  { timestamps: true }
);

tutorSessionSchema.index({ userId: 1, courseId: 1 });
tutorSessionSchema.index({ userId: 1, noteId: 1 });

export const TutorSession = mongoose.model("TutorSession", tutorSessionSchema);

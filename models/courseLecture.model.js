import mongoose from "mongoose";

const courseLectureSchema = new mongoose.Schema(
  {
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
    order: { type: Number, default: 0 },
    title: { type: String, required: true },
    /** Transcript, notes, or PDF-extracted text used for RAG */
    content: { type: String, required: true },
    videoUrl: { type: String, default: "" },
    durationMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseLectureSchema.pre("validate", function (next) {
  if (!this.courseId && !this.noteId) {
    next(new Error("courseId or noteId is required"));
  } else if (this.courseId && this.noteId) {
    next(new Error("lecture must belong to either a course or a note, not both"));
  } else {
    next();
  }
});

courseLectureSchema.index({ courseId: 1, order: 1 });
courseLectureSchema.index({ noteId: 1, order: 1 });

export const CourseLecture = mongoose.model("CourseLecture", courseLectureSchema);

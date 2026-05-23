import mongoose from "mongoose";

const courseChunkSchema = new mongoose.Schema(
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
    lectureId: {
      type: mongoose.Types.ObjectId,
      ref: "CourseLecture",
      required: true,
    },
    lectureTitle: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    /** Embedding vector — stored here for mongodb store; omitted when using Qdrant */
    embedding: { type: [Number], required: false },
  },
  { timestamps: true }
);

courseChunkSchema.pre("validate", function (next) {
  if (!this.courseId && !this.noteId) {
    next(new Error("courseId or noteId is required"));
  } else if (this.courseId && this.noteId) {
    next(new Error("chunk must belong to either a course or a note, not both"));
  } else {
    next();
  }
});

courseChunkSchema.index({ courseId: 1, lectureId: 1, chunkIndex: 1 });
courseChunkSchema.index({ noteId: 1, lectureId: 1, chunkIndex: 1 });

export const CourseChunk = mongoose.model("CourseChunk", courseChunkSchema);

import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    pages: { type: Number, required: true },
    previewImageUrl: { type: String, required: true },
    // Optional: preview PDF filename/url for first-page/first-two-pages.
    // If not provided, backend will fall back to using `downloadFileUrl`.
    previewFileUrl: { type: String, default: "" },
    downloadFileUrl: { type: String, required: true },
    isPublished: { type: Boolean, default: true },
    creatorId: {
      type: mongoose.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);

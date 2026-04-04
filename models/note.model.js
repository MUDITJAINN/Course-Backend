import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    pages: { type: Number, required: true },
    previewImageUrl: { type: String, required: true },
    // Optional: preview PDF (first pages only). Must be set for store preview; full file is never exposed here.
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

import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    pages: { type: Number, required: true },
    previewImageUrl: { type: String, required: true },
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

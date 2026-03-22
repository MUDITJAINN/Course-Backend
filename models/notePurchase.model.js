import mongoose from "mongoose";

const notePurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    noteId: {
      type: mongoose.Types.ObjectId,
      ref: "Note",
      required: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
    },
    merchantTransactionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    provider: {
      type: String,
      default: "PHONEPE",
    },
    gatewayResponse: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

notePurchaseSchema.index({ userId: 1, noteId: 1, status: 1 });

export const NotePurchase = mongoose.model("NotePurchase", notePurchaseSchema);

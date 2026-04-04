import mongoose from "mongoose";

const pruchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amountInPaise: { type: Number },
    merchantTransactionId: { type: String, sparse: true, unique: true },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
    },
    provider: { type: String, default: "PHONEPE" },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

pruchaseSchema.index({ userId: 1, courseId: 1 });

export const Purchase = mongoose.model("Purchase", pruchaseSchema);
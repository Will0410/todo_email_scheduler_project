import mongoose from "mongoose";

const ConvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  role: { type: String, enum: ["user","assistant","system"], required: true },
  message: String,
  model: String,
  rawModelResponse: mongoose.Schema.Types.Mixed,
  actionTaken: String, // e.g. send_whatsapp, send_email, none
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Conversation", ConvSchema);

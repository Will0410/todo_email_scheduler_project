import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: false },
  channel: { type: String, enum: ["whatsapp","email","webhook"], required: true },
  to: String,
  payload: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ["pending","sent","failed","retrying"], default: "pending" },
  attempts: { type: Number, default: 0 },
  lastError: String,
  response: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

export default mongoose.model("DeliveryLog", LogSchema);

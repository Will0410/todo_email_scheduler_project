import mongoose from "mongoose";

const SubSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  whatsapp: String,
  email: String,
  time: String, // "HH:MM"
  timezone: { type: String, default: "America/Sao_Paulo" },
  enabled: { type: Boolean, default: true },
  lastSent: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Subscription", SubSchema);

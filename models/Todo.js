import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    due: { type: Date, required: true },
    priority: { type: String, default: "normal" },
    tags: [String],
    email: String,
    repeat: {
      type: String,
      enum: ["nenhum", "diario", "semanal", "mensal"],
      default: "nenhum",
    },
    notified: { type: Boolean, default: false },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Todo", TodoSchema);

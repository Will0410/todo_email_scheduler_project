import express from "express";
import { authMiddleware } from "../Utils/auth.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const convs = await Conversation.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(limit);
  res.json(convs);
});

router.delete("/:id", async (req, res) => {
  await Conversation.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ success: true });
});

export default router;

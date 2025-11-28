import express from "express";
import { authMiddleware, adminOnly } from "../Utils/auth.js";
import DeliveryLog from "../models/DeliveryLog.js";
import Conversation from "../models/Conversation.js";
import Subscription from "../models/Subscription.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminOnly);

router.get("/overview", async (req, res) => {
  const total = await DeliveryLog.countDocuments();
  const sent = await DeliveryLog.countDocuments({ status: "sent" });
  const failed = await DeliveryLog.countDocuments({ status: "failed" });
  const retrying = await DeliveryLog.countDocuments({ status: "retrying" });
  const convs = await Conversation.countDocuments();
  const subs = await Subscription.countDocuments();
  res.json({ total, sent, failed, retrying, convs, subs });
});

router.get("/logs", async (req, res) => {
  const q = req.query || {};
  const logs = await DeliveryLog.find(q).sort({ createdAt: -1 }).limit(200);
  res.json(logs);
});

router.get("/conversations", async (req, res) => {
  const convs = await Conversation.find().sort({ createdAt: -1 }).limit(200);
  res.json(convs);
});

router.get("/subscriptions", async (req, res) => {
  const subs = await Subscription.find().sort({ createdAt: -1 });
  res.json(subs);
});

export default router;

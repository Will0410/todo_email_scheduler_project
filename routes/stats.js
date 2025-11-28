import express from "express";
import { authMiddleware } from "../Utils/auth.js";
import DeliveryLog from "../models/DeliveryLog.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/overview", async (req, res) => {
  const total = await DeliveryLog.countDocuments({ userId: req.user.id });
  const sent = await DeliveryLog.countDocuments({ userId: req.user.id, status: "sent" });
  const failed = await DeliveryLog.countDocuments({ userId: req.user.id, status: "failed" });
  const retrying = await DeliveryLog.countDocuments({ userId: req.user.id, status: "retrying" });
  res.json({ total, sent, failed, retrying });
});

export default router;

import express from "express";
import { authMiddleware } from "../Utils/auth.js";
import Subscription from "../models/Subscription.js";

const router = express.Router();
router.use(authMiddleware);

// list
router.get("/", async (req, res) => {
  const subs = await Subscription.find({ userId: req.user.id });
  res.json(subs);
});

// create
router.post("/", async (req, res) => {
  const { name, whatsapp, email, time } = req.body;
  const sub = await Subscription.create({ userId: req.user.id, name, whatsapp, email, time });
  res.json(sub);
});

// update
router.put("/:id", async (req, res) => {
  const sub = await Subscription.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
  res.json(sub);
});

// delete
router.delete("/:id", async (req, res) => {
  await Subscription.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ success: true });
});

export default router;

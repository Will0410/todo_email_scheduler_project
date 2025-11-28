// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../Utils/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "name, email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "email exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("auth/register error:", err);
    res.status(500).json({ error: "server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("auth/login error:", err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;

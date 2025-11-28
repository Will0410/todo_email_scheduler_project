import jwt from "jsonwebtoken";

export function signToken(user) {
  const payload = { id: user._id, email: user.email, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

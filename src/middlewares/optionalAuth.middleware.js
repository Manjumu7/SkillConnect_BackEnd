import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Optional auth — parses token if present, but does NOT reject if missing.
// Use this on public routes that need to behave differently for logged-in users.
const optionalReelAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token — continue as unauthenticated
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decoded?._id) {
      const user = await User.findById(decoded._id).select("-password");
      if (user) req.user = user;
    }
  } catch {
    // Invalid token — continue without auth
  }
  next();
};

export default optionalReelAuth;

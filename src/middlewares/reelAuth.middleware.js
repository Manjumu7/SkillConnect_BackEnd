import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Auth middleware for Reelr-related routes.
// It reuses the same ACCESS_TOKEN_SECRET and token format as SkillConnect,
// then loads the full user document (including friends, username, etc.)
// so Reelr controllers can rely on req.user having complete data.
const verifyReelJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded?._id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default verifyReelJWT;


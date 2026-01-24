import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    if (!decoded?._id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = {
      _id: decoded._id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default verifyToken;
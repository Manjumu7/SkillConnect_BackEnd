import express from "express";
import { upload } from "../middlewares/upload.middleware.js";
import verifyReelJWT from "../middlewares/reelAuth.middleware.js";
import {
  
  getMyProfile,
  myReels,
  updateProfile,
  uploadUserImage,
} from "../controllers/reelUser.controller.js";

const router = express.Router();

// Mounted under /reelr/users in app.js
router.post(
  "/upload-image",
  verifyReelJWT,
  upload.any(),
  uploadUserImage
);
router.get("/me", verifyReelJWT, getMyProfile);
router.post("/update-profile", verifyReelJWT, updateProfile);
router.get("/my-reels", verifyReelJWT, myReels);

export default router;


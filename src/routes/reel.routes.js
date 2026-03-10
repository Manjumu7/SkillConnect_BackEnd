import express from "express";
import { upload } from "../middlewares/upload.middleware.js";
import verifyReelJWT from "../middlewares/reelAuth.middleware.js";
import optionalReelAuth from "../middlewares/optionalAuth.middleware.js";
import {
  deleteReel,
  toggleDeleteReel,
  getAllReels,
  getReelById,
  getReelsByUser,
  updateReel,
  uploadReel,
  getTrendingReels,
  incrementViews,
  getTotalViewsOfCreator,
  likeUnlikeReel,
} from "../controllers/reel.controller.js";

const router = express.Router();

// Reelr-style routes, mounted under /reelr/reels in app.js
router.post("/upload", verifyReelJWT, upload.single("video"), uploadReel);

router.get("/all", optionalReelAuth, getAllReels);
router.delete("/delete/:id", verifyReelJWT, deleteReel);
router.patch("/:id/toggle-delete", verifyReelJWT, toggleDeleteReel);
router.get("/single-reel/:id", verifyReelJWT, getReelById);
router.patch("/update/:id", verifyReelJWT, updateReel);
router.get("/all-reels/:userId", verifyReelJWT, getReelsByUser);
router.get("/popular", getTrendingReels);
router.patch("/:reelId/views", incrementViews);
router.get("/total-user-views/:creatorId", verifyReelJWT, getTotalViewsOfCreator);
router.patch("/like-reel/:id", verifyReelJWT, likeUnlikeReel);

export default router;

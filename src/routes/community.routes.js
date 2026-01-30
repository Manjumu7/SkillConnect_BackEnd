import express from "express";
import { createCommunity, deleteCommunity, getAllCommunities, getCommunityById, updateCommunity } from "../controllers/community.controllers.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("admin"), upload.single("bannerImage"), createCommunity);
router.get("/", getAllCommunities);
router.get("/:id", getCommunityById);
router.put("/:id", verifyToken, authorizeRoles("admin"), upload.single("bannerImage"), updateCommunity);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCommunity);

export default router;
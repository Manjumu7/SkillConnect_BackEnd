import express from "express";
import { createCommunity, deleteCommunity, getAllCommunities, getCommunityById, updateCommunity } from "../controllers/community.controllers.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("admin"), createCommunity);
router.get("/", getAllCommunities);
router.get("/:id", getCommunityById);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateCommunity);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCommunity);

export default router;
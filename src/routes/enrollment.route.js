import express from "express";
import { enrollInCommunity, enrollMentor, getCommunityMembers, getUserCommunities, removeUserFromCommunity } from "../controllers/enrollment.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";


const router = express.Router();

router.post("/community/:communityId/mentor", verifyToken, authorizeRoles("admin"), enrollMentor);

router.get("/community/:communityId/members", verifyToken, authorizeRoles("admin",), getCommunityMembers);

router.get("/user/:userId/communities", verifyToken, authorizeRoles("admin"), getUserCommunities);

router.delete("/community/:communityId/user/:userId", verifyToken, authorizeRoles("admin"), removeUserFromCommunity);

router.post("/community/:communityId/student", verifyToken, enrollInCommunity);

export default router;

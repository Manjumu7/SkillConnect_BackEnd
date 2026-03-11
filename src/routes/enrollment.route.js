import express from "express";
import { enrollInCommunity, enrollMentor, getAllMentorEnrollments, getCommunityMembers, getMyEnrollments, getUserCommunities, removeMentorEnrollment, removeUserFromCommunity, updateMentorEnrollment } from "../controllers/enrollment.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";


const router = express.Router();

// Admin: mentor-community assignments
router.get("/mentor-assignments", verifyToken, authorizeRoles("admin"), getAllMentorEnrollments);
router.put("/mentor-assignments/:enrollmentId", verifyToken, authorizeRoles("admin"), updateMentorEnrollment);
router.delete("/mentor-assignments/:enrollmentId", verifyToken, authorizeRoles("admin"), removeMentorEnrollment);

router.post("/community/:communityId/mentor", verifyToken, authorizeRoles("admin"), enrollMentor);

router.get("/community/:communityId/members", verifyToken, authorizeRoles("admin",), getCommunityMembers);

router.get("/user/:userId/communities", verifyToken, authorizeRoles("admin"), getUserCommunities);

router.delete("/community/:communityId/user/:userId", verifyToken, authorizeRoles("admin"), removeUserFromCommunity);

router.post("/community/:communityId/student", verifyToken, enrollInCommunity);

router.get("/my", verifyToken, getMyEnrollments)

export default router;

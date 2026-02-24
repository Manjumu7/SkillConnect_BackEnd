import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { getAllSubmissionsOfProject, getMentorBatches, getMentorCommunities, getMentoredStudents } from "../controllers/mentorDashboard.controller.js";

const router = express.Router();

router.get("/assigned-communities", verifyToken, authorizeRoles("mentor"), getMentorCommunities)
router.get("/all-students", verifyToken, authorizeRoles("mentor"), getMentoredStudents)
router.get("/all-batches", verifyToken, authorizeRoles("mentor"), getMentorBatches)

router.get("/all-submissions/:projectId", verifyToken, authorizeRoles("mentor"), getAllSubmissionsOfProject)

export default router
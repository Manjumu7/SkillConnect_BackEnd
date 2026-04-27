import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { getAllSubmissionsOfProject, getEnrolledUsersByCommunity, getMentorBatches, getMentorCommunities, getMentoredStudents, getMentorProjects, getStudentProfileForMentor, gradeSubmission } from "../controllers/mentorDashboard.controller.js";

const router = express.Router();

router.get("/assigned-communities", verifyToken, authorizeRoles("mentor"), getMentorCommunities)
router.get("/all-students", verifyToken, authorizeRoles("mentor"), getMentoredStudents)
router.get("/all-batches", verifyToken, authorizeRoles("mentor"), getMentorBatches)
router.get("/enrolled-users", verifyToken, authorizeRoles("mentor"), getEnrolledUsersByCommunity)

router.get("/all-submissions/:projectId", verifyToken, authorizeRoles("mentor"), getAllSubmissionsOfProject)
router.get("/all-projects", verifyToken, authorizeRoles("mentor"), getMentorProjects)
router.put("/grade-submission/:submissionId", verifyToken, authorizeRoles("mentor"), gradeSubmission)
router.get("/student/:studentId", verifyToken, authorizeRoles("mentor"), getStudentProfileForMentor)

export default router
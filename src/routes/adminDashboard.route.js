import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { AllBatchedOfACommunity } from "../controllers/batch.controller.js";
import { allEnrolledStudentsOfACommunity } from "../controllers/community.controllers.js";
import { approveMentor, getActiveMentors, getPendingMentors, rejectMentor } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/batches/:communityId", verifyToken, authorizeRoles("admin"), AllBatchedOfACommunity)
router.get("/enrollments/:communityId", verifyToken, authorizeRoles("admin"), allEnrolledStudentsOfACommunity)

router.get("/pending-mentors-list", verifyToken, authorizeRoles("admin"), getPendingMentors)
router.get("/approve-mentor/:userId", verifyToken, authorizeRoles("admin"), approveMentor)
router.post("/reject-mentor/:userId", verifyToken, authorizeRoles("admin"), rejectMentor)
router.get("/active-mentor", verifyToken, authorizeRoles("admin"), getActiveMentors)


export default router;
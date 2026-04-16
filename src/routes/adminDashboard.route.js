import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { AllBatchedOfACommunity } from "../controllers/batch.controller.js";
import { allEnrolledStudentsOfACommunity } from "../controllers/community.controllers.js";
import { approveMentor, getActiveMentors, getPendingMentors, rejectMentor, getPendingCompanies, approveCompany, rejectCompany, getActiveCompanies } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/batches/:communityId", verifyToken, authorizeRoles("admin"), AllBatchedOfACommunity)
router.get("/enrollments/:communityId", verifyToken, authorizeRoles("admin"), allEnrolledStudentsOfACommunity)

// Mentor management
router.get("/pending-mentors-list", verifyToken, authorizeRoles("admin"), getPendingMentors)
router.get("/approve-mentor/:userId", verifyToken, authorizeRoles("admin"), approveMentor)
router.post("/reject-mentor/:userId", verifyToken, authorizeRoles("admin"), rejectMentor)
router.get("/active-mentor", verifyToken, authorizeRoles("admin"), getActiveMentors)

// Company management
router.get("/pending-companies-list", verifyToken, authorizeRoles("admin"), getPendingCompanies)
router.get("/approve-company/:userId", verifyToken, authorizeRoles("admin"), approveCompany)
router.post("/reject-company/:userId", verifyToken, authorizeRoles("admin"), rejectCompany)
router.get("/active-companies", verifyToken, authorizeRoles("admin"), getActiveCompanies)


export default router;
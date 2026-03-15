import express from "express"
import verifyToken from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authRole.middleware.js"
import { getMyBatches, getMyCommunities, getMyProjects, submitProject, upgradeEnrollment } from "../controllers/userDashboard.controller.js"
import { upload } from "../middlewares/upload.middleware.js"

const router = express.Router()

router.get("/my", verifyToken, authorizeRoles("student"), getMyCommunities)

router.get("/student-batches", verifyToken, authorizeRoles("student"), getMyBatches)
router.get("/my-projects", verifyToken, authorizeRoles("student"), getMyProjects)
router.patch("/upgrade/:communityId", verifyToken, authorizeRoles("student"), upgradeEnrollment)
router.post("/project-submisson/:projectId", verifyToken, authorizeRoles("student"), upload.single("file"), submitProject)
export default router;
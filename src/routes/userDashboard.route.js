import express from "express"
import verifyToken from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authRole.middleware.js"
import { getMyBatches, getMyCommunities, getMyProjects } from "../controllers/userDashboard.controller.js"

const router = express.Router()

router.get("/my", verifyToken, authorizeRoles("student"), getMyCommunities)

router.get("/student-batches", verifyToken, authorizeRoles("student"), getMyBatches)
router.get("/my-projects", verifyToken, authorizeRoles("student"), getMyProjects)
export default router;
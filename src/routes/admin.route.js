import express from "express"
import verifyToken from "../middlewares/auth.middleware.js"
import { getAllStudents, getAllUsers, toggleBanStudent } from "../controllers/admin.controller.js"
import { authorizeRoles } from "../middlewares/authRole.middleware.js"

const router = express.Router()


router.get("/all", verifyToken, getAllUsers)
router.get("/all-students", verifyToken, getAllStudents)
router.patch("/students/:enrollmentId/toggle-ban", verifyToken, authorizeRoles("admin"), toggleBanStudent);

export default router
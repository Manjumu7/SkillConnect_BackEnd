import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import {
    getDashboardStats,
    getLeaderboard,
    getTopPerformers,
    searchStudents,
    getStudentProfile,
} from "../controllers/companyDashboard.controller.js";

const router = express.Router();

// All routes require company authentication
router.use(verifyToken, authorizeRoles("company"));

router.get("/stats", getDashboardStats);
router.get("/leaderboard", getLeaderboard);
router.get("/top-performers", getTopPerformers);
router.get("/search", searchStudents);
router.get("/student/:id", getStudentProfile);

export default router;

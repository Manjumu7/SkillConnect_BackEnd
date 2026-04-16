import { Router } from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import verifyCommunityAccess from "../middlewares/communityAccess.middleware.js";
import {
    getLeaderboardHandler,
    getMyCommunitiesForLeaderboard
} from "../controllers/leaderboard.controller.js";

const router = Router();

// GET /leaderboard/communities  → must come BEFORE the parameterized route
router.get("/communities", verifyToken, getMyCommunitiesForLeaderboard);

// GET /leaderboard?communityId=...&page=1&limit=10
router.get("/", verifyToken, verifyCommunityAccess, getLeaderboardHandler);

export default router;

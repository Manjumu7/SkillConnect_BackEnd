import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { getMyDetails, getMyDetailedProfile } from "../controllers/user.model.js";

const router = express.Router();

router.get("/me", verifyToken, getMyDetails)
router.get("/me/profile", verifyToken, getMyDetailedProfile)

export default router;
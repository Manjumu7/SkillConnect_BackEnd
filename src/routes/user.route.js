import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { getMyDetails } from "../controllers/user.model.js";


const router = express.Router();

router.get("/me", verifyToken, getMyDetails)

export default router;
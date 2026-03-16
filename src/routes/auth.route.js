import express from "express"
import { applyForMentor, loginUser, registerUser, verifyOTP } from "../controllers/auth.controllers.js"
import verifyToken from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/mentor-register",verifyToken, applyForMentor)
router.post("/verify-otp", verifyOTP);

export default router
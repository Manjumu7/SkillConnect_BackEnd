import express from "express"
import { applyForMentor, applyForCompany, loginUser, registerUser, verifyOTP, resendOTP } from "../controllers/auth.controllers.js"
import verifyToken from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/verify-otp", verifyOTP)
router.post("/resend-otp", resendOTP)
router.post("/mentor-register", verifyToken, applyForMentor)
router.post("/company-register", verifyToken, applyForCompany)

export default router
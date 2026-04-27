import express from "express"
import { applyForMentor, applyForCompany, loginUser, registerUser, verifyOTP, resendOTP, forgotPassword, verifyResetOtp, resetPassword } from "../controllers/auth.controllers.js"
import verifyToken from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/verify-otp", verifyOTP)
router.post("/resend-otp", resendOTP)
router.post("/mentor-register", verifyToken, applyForMentor)
router.post("/company-register", verifyToken, applyForCompany)

// Password reset flow (public — no auth required)
router.post("/forgot-password", forgotPassword)
router.post("/verify-reset-otp", verifyResetOtp)
router.post("/reset-password", resetPassword)

export default router
import express from "express"
import { applyForMentor, loginUser, registerUser } from "../controllers/auth.controllers.js"
import verifyToken from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/mentor-register",verifyToken, applyForMentor)

export default router
import express from "express"
import verifyToken from "../middlewares/auth.middleware.js"
import { getAllUsers } from "../controllers/admin.controller.js"

const router = express.Router()


router.get("/all", verifyToken, getAllUsers)


export default router
import express from "express"
import { createCommunity } from "../controllers/community.controllers.js"
import verifyToken from "../middlewares/auth.middleware.js"
const router=express.Router()

router.post("/create",verifyToken ,createCommunity)

export default router
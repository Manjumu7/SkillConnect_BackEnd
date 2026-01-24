import express from "express"
import dotenv from "dotenv"
import authRouter from "./routes/auth.route.js"
import { Community } from "./models/community.modrl.js"
import communityRouter from "./routes/community.routes.js"
const app = express()


dotenv.config() // to use env files
app.use(express.json())

app.use("/auth",authRouter)

app.use("/community",communityRouter)

export default app;
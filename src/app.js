import express from "express"
import dotenv from "dotenv"
import authRouter from "./routes/auth.route.js"
const app = express()


dotenv.config() // to use env files
app.use(express.json())

app.use("/auth",authRouter)

export default app;
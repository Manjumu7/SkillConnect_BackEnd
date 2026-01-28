import express from "express"
import dotenv from "dotenv"
import authRouter from "./routes/auth.route.js"
import communityRouter from "./routes/community.routes.js"
import batchRouter from "./routes/batch.route.js"
import certificateRouter from "./routes/certificate.route.js"

const app = express()


dotenv.config()
app.use(express.json())

app.use("/auth", authRouter)
app.use("/community", communityRouter)
app.use("/batch", batchRouter)
app.use("/certificate", certificateRouter)

export default app;
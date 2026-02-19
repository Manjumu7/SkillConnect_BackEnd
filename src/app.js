import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRouter from "./routes/auth.route.js";
import communityRouter from "./routes/community.routes.js";
import batchRouter from "./routes/batch.route.js";
import certificateRouter from "./routes/certificate.route.js";
import adminRouter from "./routes/admin.route.js";
import projectRouter from "./routes/project.route.js";
import submissionRouter from "./routes/submission.route.js";
import reelRouter from "./routes/reel.routes.js";
import reelUserRouter from "./routes/reelUser.routes.js";
import moduleRoutes from "./routes/module.route.js";

const app = express();
dotenv.config();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://frontend-lime-chi-7davixz9ck.vercel.app"
];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json());

app.use("/auth", authRouter);
app.use("/community", communityRouter);
app.use("/batch", batchRouter);
app.use("/certificate", certificateRouter);
app.use("/admin", adminRouter);
app.use("/project", projectRouter);
app.use("/submission", submissionRouter);
app.use("/reelr/reels", reelRouter);
app.use("/reelr/users", reelUserRouter);
app.use("/modules", moduleRoutes);

export default app;

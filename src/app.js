import express from "express"
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
import moduleRoutes from "./routes/module.route.js"

const app = express();
dotenv.config();

// CORS configuration - must be before routes
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    // Add your production frontend URL here
    // "https://your-frontend-domain.com"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204
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
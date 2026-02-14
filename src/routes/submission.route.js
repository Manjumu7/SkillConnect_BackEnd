import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { createSubmission, getMySubmissions, getProjectSubmissions, reviewSubmission, softDeleteSubmission } from "../controllers/submission.controller.js";
import { upload } from "../middlewares/upload.middleware.js";


const router = express.Router();

router.post(
    "/",
    verifyToken,
    authorizeRoles("student"),
    upload.array("files", 5),
    createSubmission
);

router.get("/me", verifyToken, authorizeRoles("student"), getMySubmissions);

router.get(
    "/project/:projectId",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    getProjectSubmissions
);

router.put(
    "/:id/review",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    reviewSubmission
);

router.delete("/:id", verifyToken, authorizeRoles("admin"), softDeleteSubmission);
export default router;

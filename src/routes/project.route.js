import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { createProject, getAllProjects, getProjectById, softDeleteProject, updateProject } from "../controllers/project.controller.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";


const router = express.Router();

router.get("/", verifyToken, getAllProjects);
router.get("/:id", verifyToken, getProjectById);

router.post(
    "/:communityId",
    verifyToken,
    authorizeRoles("mentor"),
    upload.single("banner"),
    createProject
);

router.put(
    "/:id",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    upload.single("banner"),
    updateProject
);

router.delete(
    "/:id",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    softDeleteProject
);

export default router;

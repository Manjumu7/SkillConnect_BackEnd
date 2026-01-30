import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { createProject, getAllProjects, getProjectById, softDeleteProject, updateProject } from "../controllers/project.controller.js";


const router = express.Router();

router.get("/", verifyToken, getAllProjects);
router.get("/:id", verifyToken, getProjectById);

router.post(
    "/",
    verifyToken,
    authorize("admin", "mentor"),
    upload.single("banner"),
    createProject
);

router.put(
    "/:id",
    verifyToken,
    authorize("admin", "mentor"),
    upload.single("banner"),
    updateProject
);

router.delete(
    "/:id",
    verifyToken,
    authorize("admin", "mentor"),
    softDeleteProject
);

export default router;

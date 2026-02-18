import express from "express";
import { addModule, deleteModule, updateModule } from "../controllers/module.controller.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
    "/:communityId",
    verifyToken,
    authorizeRoles("admin"),
    addModule
);

router.put(
    "/:communityId/:moduleId",
    verifyToken,
    authorizeRoles("admin"),
    updateModule
);

router.delete(
    "/:communityId/:moduleId",
    verifyToken,
    authorizeRoles("admin"),
    deleteModule
);

export default router;

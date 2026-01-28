import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { createBatch, deleteBatch, getAllBatches, getMyBatches, removeStudentFromBatch, updateBatch } from "../controllers/batch.controller.js";


const router = express.Router();

router.post("/", verifyToken, authorizeRoles("admin", "mentor"), createBatch);

router.get("/", verifyToken, authorizeRoles("admin"), getAllBatches);

router.get("/my", verifyToken, authorizeRoles("mentor", "student"), getMyBatches);

router.put("/:batchId", verifyToken, authorizeRoles("admin", "mentor"), updateBatch);

router.delete("/:batchId", verifyToken, authorizeRoles("admin", "mentor"), deleteBatch);

router.delete(
    "/:communityId/kick/:userId",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    removeStudentFromBatch
);

export default router;

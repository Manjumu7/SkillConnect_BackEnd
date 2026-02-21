import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import { createBatch, deleteBatch, getAllBatches, getMyBatches, removeStudentFromBatch, updateBatch, upgradeToPro } from "../controllers/batch.controller.js";
import { upload } from "../middlewares/upload.middleware.js";


const router = express.Router();

router.post("/:communityId", verifyToken, authorizeRoles("admin", "mentor"), upload.single("bannerImage"), createBatch);

router.get("/", verifyToken, authorizeRoles("admin"), getAllBatches);

router.get("/my", verifyToken, authorizeRoles("mentor", "student"), getMyBatches);

router.put("/:batchId", verifyToken, authorizeRoles("admin", "mentor"), upload.single("bannerImage"), updateBatch);

router.delete("/:batchId", verifyToken, authorizeRoles("admin", "mentor"), deleteBatch);

router.delete(
    "/:communityId/kick/:userId",
    verifyToken,
    authorizeRoles("admin", "mentor"),
    removeStudentFromBatch
);

router.patch("/pro/:communityId", verifyToken, authorizeRoles("student"), upgradeToPro)

export default router;

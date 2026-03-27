import express from "express";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";
import {
    createCertificate,
    deleteCertificate,
    getAllCertificates,
    getCertificateById,
    getUserCertificates,
    getScoreForCommunity,
    generateStudentCertificate,
    getMyCertificates,
    getCertificateDetail,
    verifyCertificate
} from "../controllers/certificate.controller.js";

const router = express.Router();

// ─── Student Routes (must be above /:id to avoid conflicts) ─────
router.get("/score/:communityId", verifyToken, getScoreForCommunity);
router.post("/generate", verifyToken, generateStudentCertificate);
router.get("/my", verifyToken, getMyCertificates);
router.get("/detail/:id", verifyToken, getCertificateDetail);

// ─── Public Route ───────────────────────────────────────────────
router.get("/verify/:certId", verifyCertificate);

// ─── Admin Routes ───────────────────────────────────────────────
router.post("/", verifyToken, authorizeRoles("admin"), createCertificate);
router.get("/", verifyToken, authorizeRoles("admin"), getAllCertificates);
router.get("/:id", verifyToken, authorizeRoles("admin"), getCertificateById);
router.get("/user/:userId", verifyToken, authorizeRoles("admin"), getUserCertificates);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCertificate);

export default router;

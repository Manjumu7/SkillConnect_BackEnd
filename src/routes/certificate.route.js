import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import checkEligibility from "../middlewares/eligibility.middleware.js";
import {
    getUserScore,
    generateCertificate,
    getMyCertificates,
    getCertificateById,
    verifyCertificate,
    createCertificate,
    getAllCertificates,
    getCertificateByIdAdmin,
    deleteCertificate,
    getUserCertificates
} from "../controllers/certificate.controller.js";

const router = express.Router();

// ─── Student-Facing Routes ─────────────────────────────────────────────────────

// Get user's score (protected)
router.get("/score", verifyToken, getUserScore);

// Get logged-in user's certificates (protected + eligibility)
router.get("/my", verifyToken, checkEligibility, getMyCertificates);

// Generate a certificate (protected + eligibility)
router.post("/generate", verifyToken, checkEligibility, generateCertificate);

// Public certificate verification (NO auth needed)
router.get("/verify/:certId", verifyCertificate);

// Get single certificate by _id (protected + eligibility + ownership)
router.get("/detail/:id", verifyToken, checkEligibility, getCertificateById);

// ─── Admin Routes (preserved) ──────────────────────────────────────────────────
// ─── Student Routes ────────────────────────────────────────────────────────────

// Get logged-in user's score
router.get("/score", verifyToken, getUserScore);

// Get logged-in user's certificates
router.get("/my", verifyToken, getMyCertificates);

// Generate a certificate (eligibility enforced here — score >= 60 checked in controller)
router.post("/generate", verifyToken, checkEligibility, generateCertificate);

// Public certificate verification (no auth needed)
router.get("/verify/:certId", verifyCertificate);

// Get single certificate by _id (ownership checked in controller)
router.get("/detail/:id", verifyToken, getCertificateById);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.post("/", verifyToken, authorizeRoles("admin"), createCertificate);
router.get("/", verifyToken, authorizeRoles("admin"), getAllCertificates);
router.get("/user/:userId", verifyToken, authorizeRoles("admin"), getUserCertificates);
router.get("/:id", verifyToken, authorizeRoles("admin"), getCertificateByIdAdmin);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCertificate);

export default router;
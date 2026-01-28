import express from "express";
import { authorizeRoles } from "../middlewares/authRole.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";
import { createCertificate, deleteCertificate, getAllCertificates, getCertificateById, getUserCertificates } from "../controllers/certificate.controller.js";


const router = express.Router();

router.post("/", verifyToken, authorizeRoles("admin"), createCertificate);

router.get("/", verifyToken, authorizeRoles("admin"), getAllCertificates);

router.get("/:id", verifyToken, authorizeRoles("admin"), getCertificateById);

router.get("/user/:userId", verifyToken, authorizeRoles("admin"), getUserCertificates);

router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCertificate);

export default router;

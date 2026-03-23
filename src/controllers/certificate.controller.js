import { Certificate } from "../models/certificate.model.js";
import { User } from "../models/user.model.js";

// ─── Student-Facing Controllers ───────────────────────────────────────────────

/**
 * GET /api/certificates/score
 * Returns the authenticated user's current score
 */
export const getUserScore = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("score name");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ score: user.score, name: user.name });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /api/certificates/generate
 * Generate a certificate for the logged-in user (eligibility checked by middleware)
 */
export const generateCertificate = async (req, res) => {
    try {
        const userId = req.user._id;
        const { communityId, courseName } = req.body;

        if (!communityId || !courseName) {
            return res.status(400).json({ message: "communityId and courseName are required" });
        }

        // Prevent duplicate certificate for same user + community
        const existing = await Certificate.findOne({ userId, communityId });
        if (existing) {
            return res.status(409).json({
                message: "Certificate already issued for this community",
                certificate: existing
            });
        }

        const certificate = await Certificate.create({
            userId,
            communityId,
            courseName
        });

        res.status(201).json({ success: true, certificate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/certificates/my
 * Get all certificates belonging to the logged-in user
 */
export const getMyCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({ userId: req.user._id })
            .populate("communityId", "name")
            .sort({ issuedAt: -1 });

        res.json({ success: true, certificates });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/certificates/detail/:id
 * Get a single certificate by its MongoDB _id (must belong to logged-in user)
 */
export const getCertificateById = async (req, res) => {
    try {
        const { id } = req.params;

        const certificate = await Certificate.findById(id)
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate) {
            return res.status(404).json({ message: "Certificate not found" });
        }

        // Ownership check
        if (certificate.userId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied: not your certificate" });
        }

        res.json({ success: true, certificate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/certificates/verify/:certId
 * PUBLIC — verify a certificate by its unique certificateId string
 */
export const verifyCertificate = async (req, res) => {
    try {
        const { certId } = req.params;

        const certificate = await Certificate.findOne({ certificateId: certId })
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate) {
            return res.status(404).json({ valid: false, message: "Certificate not found" });
        }

        res.json({
            valid: true,
            user: certificate.userId.name,
            email: certificate.userId.email,
            course: certificate.courseName,
            community: certificate.communityId?.name || "N/A",
            issuedAt: certificate.issuedAt,
            certificateId: certificate.certificateId
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Admin Controllers (preserved from original) ─────────────────────────────

export const createCertificate = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId, communityId, courseName } = req.body;
        if (!userId || !communityId)
            return res.status(400).json({ message: "userId and communityId required" });

        const exists = await Certificate.findOne({ userId, communityId });
        if (exists)
            return res.status(409).json({ message: "Certificate already issued" });

        const certificate = await Certificate.create({
            userId,
            communityId,
            courseName: courseName || "Community Projects"
        });

        res.status(201).json({ success: true, certificate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllCertificates = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const certificates = await Certificate.find()
            .populate("userId", "name email")
            .populate("communityId", "name");

        res.json({ success: true, count: certificates.length, certificates });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getCertificateByIdAdmin = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { id } = req.params;
        const certificate = await Certificate.findById(id)
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate)
            return res.status(404).json({ message: "Certificate not found" });

        res.json({ success: true, certificate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteCertificate = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { id } = req.params;
        const certificate = await Certificate.findByIdAndDelete(id);
        if (!certificate)
            return res.status(404).json({ message: "Certificate not found" });

        res.json({ success: true, message: "Certificate removed" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserCertificates = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId } = req.params;
        const certificates = await Certificate.find({ userId })
            .populate("communityId", "name");

        res.json({ success: true, certificates });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

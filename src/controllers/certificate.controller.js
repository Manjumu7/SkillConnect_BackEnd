import mongoose from "mongoose";
import { Certificate } from "../models/certificate.model.js";
import { User } from "../models/user.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Project } from "../models/project.model.js";
import { Submission } from "../models/submission.model.js";

// ─── Student-Facing Controllers ───────────────────────────────────────────────

/**
 * GET /api/certificates/score/:communityId
 * Computes the student's total score for a specific community
 * by summing grades from all reviewed submissions on that community's projects.
 */
export const getUserScore = async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user._id;

        if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: "Valid communityId is required" });
        }

        const user = await User.findById(userId).select("name");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find all non-deleted projects belonging to this community
        const projects = await Project.find({ communityId, isDeleted: false }).select("_id");
        const projectIds = projects.map(p => p._id);

        // Aggregate reviewed submission grades for this student across community projects
        const result = await Submission.aggregate([
            {
                $match: {
                    studentId: new mongoose.Types.ObjectId(userId),
                    projectId: { $in: projectIds },
                    status: "reviewed",
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: "$grade" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const score = result.length > 0 ? result[0].totalScore : 0;
        const reviewedCount = result.length > 0 ? result[0].count : 0;

        res.json({
            score,
            name: user.name,
            communityId,
            reviewedSubmissions: reviewedCount,
            totalProjects: projectIds.length,
            eligible: score >= 60
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /api/certificates/generate
 * Generates a certificate if student scored >= 60 in community
 * Body: { communityId, courseName }
 */
export const generateCertificate = async (req, res) => {
    try {
        const { communityId, courseName } = req.body;
        const userId = req.user._id;

        if (!communityId || !courseName) {
            return res.status(400).json({ message: "communityId and courseName are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: "Invalid community ID" });
        }

        // Verify student is enrolled
        const enrollment = await Enrollment.findOne({
            userId,
            communityId,
            status: "active"
        });

        if (!enrollment) {
            return res.status(403).json({ message: "Not enrolled in this community" });
        }

        // Prevent duplicate certificate for same user + community
        const existing = await Certificate.findOne({ userId, communityId });
        if (existing) {
            return res.status(409).json({
                message: "Certificate already issued for this community",
                certificate: existing
            });
        }

        // Compute score from reviewed submissions
        const projects = await Project.find({ communityId, isDeleted: false }).select("_id");
        const projectIds = projects.map(p => p._id);

        const result = await Submission.aggregate([
            {
                $match: {
                    studentId: new mongoose.Types.ObjectId(userId),
                    projectId: { $in: projectIds },
                    status: "reviewed",
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: "$grade" }
                }
            }
        ]);

        const score = result.length > 0 ? result[0].totalScore : 0;

        if (score < 60) {
            return res.status(403).json({
                message: "Score below 60. Certificate cannot be issued.",
                score
            });
        }

        const certificate = await Certificate.create({
            userId,
            communityId,
            courseName,
            score
        });

        res.status(201).json({ success: true, certificate });

    } catch (err) {
        if (err.code === 11000) {
            // Handle race-condition duplicate
            const existing = await Certificate.findOne({
                userId: req.user._id,
                communityId: req.body.communityId
            });
            return res.status(409).json({
                message: "Certificate already issued for this community",
                certificate: existing
            });
        }
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/certificates/my
 * Returns all certificates belonging to the logged-in student
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
 * Returns a single certificate by MongoDB _id (must belong to logged-in user)
 */
export const getCertificateById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid certificate ID" });
        }

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
 * PUBLIC — verifies a certificate by its unique certificateId (UUID)
 */
export const verifyCertificate = async (req, res) => {
    try {
        const { certId } = req.params;

        const certificate = await Certificate.findOne({ certificateId: certId })
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate) {
            return res.status(404).json({ valid: false, message: "Certificate not found or invalid" });
        }

        res.json({
            valid: true,
            success: true,
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

// ─── Admin Controllers ────────────────────────────────────────────────────────

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
            courseName: courseName || "Community Projects",
            score: 100
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
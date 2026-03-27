import mongoose from "mongoose";
import { Certificate } from "../models/certificate.model.js";
import { Submission } from "../models/submission.model.js";
import { Project } from "../models/project.model.js";
import { Enrollment } from "../models/enrollment.model.js";

// ─── Student Endpoints ───────────────────────────────────────────────

/**
 * GET /certificate/score/:communityId
 * Returns the student's total reviewed-submission score for a community
 */
export const getScoreForCommunity = async (req, res) => {
    try {
        const { communityId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: "Invalid community ID" });
        }

        // Get all project IDs belonging to this community
        const projects = await Project.find({
            communityId,
            isDeleted: false
        }).select("_id");

        const projectIds = projects.map(p => p._id);

        if (projectIds.length === 0) {
            return res.json({ success: true, score: 0 });
        }

        // Aggregate reviewed submissions for this student in those projects
        const result = await Submission.aggregate([
            {
                $match: {
                    studentId: new mongoose.Types.ObjectId(req.user._id),
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

        res.json({ success: true, score });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /certificate/generate
 * Body: { communityId, courseName }
 * Generates a certificate if student scored >= 60 in community
 */
export const generateStudentCertificate = async (req, res) => {
    try {
        const { communityId, courseName } = req.body;

        if (!communityId || !courseName) {
            return res.status(400).json({ message: "communityId and courseName required" });
        }

        if (!mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: "Invalid community ID" });
        }

        // Verify student is enrolled
        const enrollment = await Enrollment.findOne({
            userId: req.user._id,
            communityId,
            status: "active"
        });

        if (!enrollment) {
            return res.status(403).json({ message: "Not enrolled in this community" });
        }

        // Check if certificate already exists
        const existing = await Certificate.findOne({
            userId: req.user._id,
            communityId
        }).populate("communityId", "name");

        if (existing) {
            return res.status(409).json({
                message: "Certificate already issued",
                certificate: existing
            });
        }

        // Compute score
        const projects = await Project.find({ communityId, isDeleted: false }).select("_id");
        const projectIds = projects.map(p => p._id);

        const result = await Submission.aggregate([
            {
                $match: {
                    studentId: new mongoose.Types.ObjectId(req.user._id),
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

        // Create certificate
        const certificate = await Certificate.create({
            userId: req.user._id,
            communityId,
            courseName,
            score
        });

        res.status(201).json({ success: true, certificate });

    } catch (err) {
        if (err.code === 11000) {
            // Race-condition duplicate
            const existing = await Certificate.findOne({
                userId: req.user._id,
                communityId: req.body.communityId
            });
            return res.status(409).json({
                message: "Certificate already issued",
                certificate: existing
            });
        }
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /certificate/my
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
 * GET /certificate/detail/:id
 * Returns a single certificate by MongoDB _id (for full-page view)
 */
export const getCertificateDetail = async (req, res) => {
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

        res.json({ success: true, certificate });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /certificate/verify/:certId
 * Public endpoint — verifies a certificate by its unique certificateId (UUID)
 */
export const verifyCertificate = async (req, res) => {
    try {
        const { certId } = req.params;

        const certificate = await Certificate.findOne({ certificateId: certId })
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate) {
            return res.status(404).json({ message: "Certificate not found or invalid" });
        }

        res.json({
            success: true,
            verified: true,
            certificate
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Admin Endpoints (unchanged) ────────────────────────────────────

export const createCertificate = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId, communityId } = req.body;
        if (!userId || !communityId)
            return res.status(400).json({ message: "userId and communityId required" });

        const exists = await Certificate.findOne({ userId, communityId });
        if (exists)
            return res.status(409).json({ message: "Certificate already issued" });

        const certificate = await Certificate.create({ userId, communityId, courseName: "Admin Issued", score: 100 });

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

export const getCertificateById = async (req, res) => {
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

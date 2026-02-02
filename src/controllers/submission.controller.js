import mongoose from "mongoose";

import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Project } from "../models/project.model.js";
import { Submission } from "../models/submission.model.js";

const roleGuard = (user, roles) => {
    if (!user || !roles.includes(user.role)) {
        throw new Error("Unauthorized");
    }
};

const getResourceType = (mimetype) => {
    if (mimetype.startsWith("image")) return "image";
    if (mimetype.startsWith("video")) return "video";
    return "raw";
};

const mapFileType = (mimetype) => {
    if (mimetype.startsWith("image")) return "image";
    if (mimetype.startsWith("video")) return "video";
    return "document";
};

export const createSubmission = async (req, res) => {
    try {
        roleGuard(req.user, ["student"]);

        const { projectId, notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await Project.findOne({
            _id: projectId,
            isDeleted: false,
            status: "open"
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not available" });
        }

        if (!req.files || !req.files.length) {
            return res.status(400).json({ success: false, message: "Files required" });
        }

        const uploads = await Promise.all(
            req.files.map(file =>
                uploadToCloudinary(
                    file.buffer,
                    "submissions",
                    getResourceType(file.mimetype)
                ).then(result => ({
                    url: result.secure_url,
                    type: mapFileType(file.mimetype)
                }))
            )
        );

        const submission = await Submission.create({
            projectId,
            studentId: req.user._id,
            notes,
            files: uploads
        });

        return res.status(201).json({ success: true, data: submission });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You already submitted this project"
            });
        }

        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const getMySubmissions = async (req, res) => {
    try {
        roleGuard(req.user, ["student"]);

        const submissions = await Submission.find({
            studentId: req.user._id,
            isDeleted: false
        })
            .populate("projectId", "title dueDate status")
            .sort({ createdAt: -1 });

        return res.json({ success: true, data: submissions });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const getProjectSubmissions = async (req, res) => {
    try {
        roleGuard(req.user, ["admin", "mentor"]);

        const { projectId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const submissions = await Submission.find({
            projectId,
            isDeleted: false
        })
            .populate("studentId", "name email")
            .sort({ createdAt: -1 });

        return res.json({ success: true, data: submissions });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const reviewSubmission = async (req, res) => {
    try {
        roleGuard(req.user, ["admin", "mentor"]);

        const { id } = req.params;
        const { grade, feedback } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const submission = await Submission.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { grade, feedback, status: "reviewed" },
            { new: true, runValidators: true }
        );

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        return res.json({ success: true, data: submission });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const softDeleteSubmission = async (req, res) => {
    try {
        roleGuard(req.user, ["admin"]);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const submission = await Submission.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        return res.json({ success: true, message: "Submission deleted" });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Project } from "../models/project.model";
import { uploadToCloudinary } from "../utils/cloudinary";

export const createProject = async (req, res) => {
    try {
        roleGuard(req.user);

        const { title, description, dueDate, communityId, batchId } = req.body;

        if (!title || !description || !dueDate || !communityId) {
            return res.status(400).json({ success: false, message: "Missing fields" });
        }

        let bannerImage;

        if (req.file) {
            const resourceType = getResourceType(req.file.mimetype);
            const upload = await uploadToCloudinary(
                req.file.buffer,
                "projects/banners",
                resourceType
            );
            bannerImage = upload.secure_url;
        }

        const project = await Project.create({
            title,
            description,
            bannerImage,
            dueDate,
            mentorId: req.user._id,
            communityId,
            batchId: batchId || null
        });

        return res.status(201).json({ success: true, data: project });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};


export const updateProject = async (req, res) => {
    try {
        roleGuard(req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const filter = { _id: id, isDeleted: false };

        if (req.user.role === "mentor") {
            filter.mentorId = req.user._id;
        }

        const project = await Project.findOne(filter);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or unauthorized"
            });
        }

        if (req.file) {
            const resourceType = getResourceType(req.file.mimetype);
            const upload = await uploadToCloudinary(
                req.file.buffer,
                "projects/banners",
                resourceType
            );
            project.bannerImage = upload.secure_url;
        }

        Object.assign(project, req.body);
        await project.save();

        return res.json({ success: true, data: project });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};


export const softDeleteProject = async (req, res) => {
    try {
        roleGuard(req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const filter = { _id: id, isDeleted: false };

        if (req.user.role === "mentor") {
            filter.mentorId = req.user._id;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { isDeleted: true, status: "archived" },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or unauthorized"
            });
        }

        return res.json({ success: true, message: "Project deleted" });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};


export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const project = await Project.findOne({
            _id: id,
            isDeleted: false
        }).populate("mentorId communityId batchId");

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        return res.json({ success: true, data: project });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};


export const getAllProjects = async (req, res) => {
    try {
        const { status, communityId, batchId, page = 1, limit = 10 } = req.query;

        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (communityId) filter.communityId = communityId;
        if (batchId) filter.batchId = batchId;

        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .populate("mentorId", "name email role")
                .populate("communityId", "name")
                .populate("batchId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Project.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: projects
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

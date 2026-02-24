import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Project } from "../models/project.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Enrollment } from "../models/enrollment.model.js";
import { ProjectAssignment } from "../models/projectAssignment.model.js";
import { Community } from "../models/community.modrl.js";

export const createProject = async (req, res) => {
    try {
        // 1️⃣ Only mentor can create
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { communityId } = req.params;
        const { title, description, dueDate } = req.body;

        // 2️⃣ Basic validation
        if (!title || !description || !dueDate || !communityId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // 3️⃣ Validate due date (must be future)
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime()) || parsedDueDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Due date must be a valid future date"
            });
        }

        // 4️⃣ Check community exists
        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // 5️⃣ (Optional but recommended) Check mentor belongs to community
        const mentorEnrollment = await Enrollment.findOne({
            userId: req.user._id,
            communityId,
            role: "mentor",
            status: "active"
        });

        if (!mentorEnrollment) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized for this community"
            });
        }

        let bannerImage;

        // 6️⃣ Upload banner if exists
        if (req.file) {
            const upload = await uploadToCloudinary(
                req.file.buffer,
                "projects/banners"
            );
            bannerImage = upload.secure_url;
        }

        // 7️⃣ Create project
        const project = await Project.create({
            title,
            description,
            bannerImage,
            dueDate: parsedDueDate,
            mentorId: req.user._id,
            communityId
        });

        // 8️⃣ Get active PRO students
        const proStudents = await Enrollment.find({
            communityId,
            role: "student",
            plan: "pro",
            status: "active"
        }).select("userId");

        if (proStudents.length === 0) {
            return res.status(201).json({
                success: true,
                message: "Project created. No pro students to assign.",
                data: project
            });
        }

        // 9️⃣ Prepare assignments
        const assignments = proStudents.map(student => ({
            userId: student.userId,
            projectId: project._id,
            status: "assigned"
        }));

        // 🔟 Insert assignments safely (assumes unique index on userId + projectId)
        await ProjectAssignment.insertMany(assignments, {
            ordered: false
        });

        return res.status(201).json({
            success: true,
            message: "Project created and assigned to pro students",
            data: project
        });

    } catch (err) {
        console.error("Create project error:", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateProject = async (req, res) => {
    try {
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            });
        }

        const project = await Project.findOne({
            _id: id,
            mentorId: req.user._id,
            isDeleted: false
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or unauthorized"
            });
        }

        const allowedFields = ["title", "description", "dueDate", "status"];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {

                if (field === "dueDate") {
                    const parsed = new Date(req.body.dueDate);
                    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
                        return res.status(400).json({
                            success: false,
                            message: "Due date must be a valid future date"
                        });
                    }
                    project.dueDate = parsed;
                } else {
                    project[field] = req.body[field];
                }
            }
        }

        if (req.file) {
            const upload = await uploadToCloudinary(
                req.file.buffer,
                "projects/banners"
            );
            project.bannerImage = upload.secure_url;
        }

        await project.save();

        return res.json({
            success: true,
            data: project
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


export const softDeleteProject = async (req, res) => {
    try {
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            });
        }

        const project = await Project.findOne({
            _id: id,
            mentorId: req.user._id,
            isDeleted: false
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or unauthorized"
            });
        }

        project.isDeleted = true;
        project.status = "archived";
        await project.save();

        // Archive assignments
        await ProjectAssignment.updateMany(
            { projectId: id },
            { status: "archived" }
        );

        return res.json({
            success: true,
            message: "Project archived successfully"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            });
        }

        const project = await Project.findOne({
            _id: id,
            isDeleted: false
        })
            .populate("mentorId", "name email role")
            .populate("communityId", "name");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.json({
            success: true,
            data: project
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getAllProjects = async (req, res) => {
    try {
        const { status, communityId, page = 1, limit = 10 } = req.query;

        const filter = { isDeleted: false };

        if (status) filter.status = status;
        if (communityId) filter.communityId = communityId;

        // Scope by role
        if (req.user.role === "mentor") {
            filter.mentorId = req.user._id;
        }

        if (req.user.role === "student") {
            const enrollments = await Enrollment.find({
                userId: req.user._id,
                status: "active"
            }).select("communityId");

            const communityIds = enrollments.map(e => e.communityId);
            filter.communityId = { $in: communityIds };
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .populate("mentorId", "name email")
                .populate("communityId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
            Project.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
            data: projects
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


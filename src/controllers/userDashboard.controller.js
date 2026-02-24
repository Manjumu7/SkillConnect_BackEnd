import { Batch } from "../models/batch.model.js";
import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Project } from "../models/project.model.js";
import { ProjectAssignment } from "../models/projectAssignment.model.js";
import { Submission } from "../models/submission.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const getMyCommunities = async (req, res) => {
    try {
        const userId = req.user._id;

        const enrollments = await Enrollment.find({
            userId,
            role: "student",
            status: "active"
        })
            .populate("communityId", "name description bannerImage membersCount visibility isDeleted")
            .sort({ createdAt: -1 })

        const communities = enrollments
            .filter(e => e.communityId && !e.communityId.isDeleted)
            .map(e => e.communityId)

        return res.status(200).json({
            success: true,
            count: communities.length,
            communities
        });

    } catch (error) {
        console.error("Error fetching student communities:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

export const getMyBatches = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Find all active enrollments for this student (regardless of plan)
        const enrollments = await Enrollment.find({
            userId,
            status: "active"
            // plan: "pro" <- Removed to allow all joined communities to show
        }).select("communityId");

        if (enrollments.length === 0) {
            return res.status(200).json({
                success: true,
                batches: []
            });
        }

        const communityIds = enrollments.map(e => e.communityId);

        // 2. Find batches where isDeleted is false for those communities
        const batches = await Batch.find({
            communityId: { $in: communityIds },
            isDeleted: false
        })
            .populate("mentorId", "name profileImage")
            .populate("communityId", "name bannerImage")
            .sort({ classAt: 1 });

        const now = new Date();
        const formattedBatches = batches.map(batch => ({
            ...batch.toObject(),
            status: new Date(batch.classAt) > now ? "upcoming" : "completed"
        }));

        return res.status(200).json({
            success: true,
            batches: formattedBatches
        });

    } catch (error) {
        console.error("Error fetching batches:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getMyProjects = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const userId = req.user._id;

        // 1️⃣ Get assignments for this student
        const assignments = await ProjectAssignment.find({
            userId
        })
            .populate({
                path: "projectId",
                match: { isDeleted: false },
                populate: [
                    { path: "mentorId", select: "name profileImage" },
                    { path: "communityId", select: "name bannerImage" }
                ]
            })
            .sort({ createdAt: -1 });

        // 2️⃣ Remove assignments where project was deleted
        const validAssignments = assignments.filter(a => a.projectId);

        const now = new Date();

        // 3️⃣ Format response
        const projects = validAssignments.map(a => {
            const project = a.projectId;

            const deadlinePassed = new Date(project.dueDate) < now;

            return {
                _id: project._id,
                title: project.title,
                description: project.description,
                bannerImage: project.bannerImage,
                dueDate: project.dueDate,
                community: project.communityId,
                mentor: project.mentorId,
                assignmentStatus: a.status,
                submissionDate: a.submittedAt,
                projectStatus: deadlinePassed ? "closed" : "open"
            };
        });

        return res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });

    } catch (err) {
        console.error("Get my projects error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const submitProject = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { projectId } = req.params;
        const { notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        // Check assignment
        const assignment = await ProjectAssignment.findOne({
            projectId,
            userId: req.user._id
        });

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this project"
            });
        }

        if (assignment.status === "submitted" || assignment.status === "graded") {
            return res.status(400).json({
                success: false,
                message: "Project already submitted"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one file is required"
            });
        }

        // Upload files
        const uploadedFiles = [];

        for (const file of req.files) {
            const upload = await uploadToCloudinary(
                file.buffer,
                "projects/submissions"
            );

            uploadedFiles.push({
                url: upload.secure_url,
                type: file.mimetype.startsWith("image")
                    ? "image"
                    : file.mimetype.startsWith("video")
                        ? "video"
                        : "document"
            });
        }

        // Create submission
        const submission = await Submission.create({
            projectId,
            studentId: req.user._id,
            files: uploadedFiles,
            notes
        });

        // Update assignment
        assignment.status = "submitted";
        assignment.submittedAt = new Date();
        await assignment.save();

        return res.status(201).json({
            success: true,
            message: "Project submitted successfully",
            data: submission
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
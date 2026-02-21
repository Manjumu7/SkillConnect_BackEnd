import { Batch } from "../models/batch.model.js";
import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { ProjectAssignment } from "../models/projectAssignment.model.js";

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

        const enrollments = await Enrollment.find({
            userId,
            role: "student",
            status: "active",
            plan: "pro",
            batchId: { $ne: null }
        }).select("batchId");

        if (enrollments.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                batches: []
            });
        }

        const batchIds = enrollments.map(e => e.batchId);

        const batches = await Batch.find({
            _id: { $in: batchIds },
            isDeleted: false
        })
            .populate("mentorId", "name profileImage")
            .populate("communityId", "name bannerImage")
            .sort({ classAt: 1 });

        const now = new Date();

        const formattedBatches = batches.map(batch => {
            const status =
                new Date(batch.classAt) > now
                    ? "upcoming"
                    : "completed";

            return {
                ...batch.toObject(),
                status
            };
        });

        return res.status(200).json({
            success: true,
            count: formattedBatches.length,
            batches: formattedBatches
        });

    } catch (error) {
        console.error("Error fetching batches:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
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
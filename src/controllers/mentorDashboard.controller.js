import mongoose from "mongoose";
import { Batch } from "../models/batch.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Project } from "../models/project.model.js";
import { Submission } from "../models/submission.model.js";

export const getMentorCommunities = async (req, res) => {
    try {
        const mentorId = req.user._id;

        const enrollments = await Enrollment.find({
            userId: mentorId,
            role: "mentor",
            status: "active"
        }).populate("communityId");

        // Map to return just the community data
        const communities = enrollments.map(enroll => enroll.communityId);

        return res.status(200).json({
            success: true,
            count: communities.length,
            communities
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


export const getMentoredStudents = async (req, res) => {
    try {
        const mentorId = req.user._id;

        // 1. Get IDs of all communities this mentor is assigned to
        const mentorEnrollments = await Enrollment.find({
            userId: mentorId,
            role: "mentor",
            status: "active"
        }).select("communityId");

        const communityIds = mentorEnrollments.map(e => e.communityId);

        if (communityIds.length === 0) {
            return res.status(200).json({ success: true, students: [] });
        }

        // 2. Find all students enrolled in these communities
        // We use .populate("userId") to get student profile details
        const studentEnrollments = await Enrollment.find({
            communityId: { $in: communityIds },
            role: "student",
            status: "active"
        })
            .populate("userId", "name email profileImage username") // Only fetch necessary fields
            .populate("communityId", "name"); // Optional: to know which community they belong to

        // 3. Optional: Remove duplicate students if a student is in multiple communities with the same mentor
        const uniqueStudentsMap = new Map();

        studentEnrollments.forEach(enrollment => {
            const student = enrollment.userId;
            if (student && !uniqueStudentsMap.has(student._id.toString())) {
                uniqueStudentsMap.set(student._id.toString(), {
                    ...student._doc,
                    communityName: enrollment.communityId.name // Just for context
                });
            }
        });

        const students = Array.from(uniqueStudentsMap.values());

        return res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMentorBatches = async (req, res) => {
    try {
        const mentorId = req.user._id;

        // Find all batches assigned to this mentor that aren't deleted
        const batches = await Batch.find({
            mentorId: mentorId,
            isDeleted: false
        })
            .populate("communityId", "name bannerImage") // Get community context
            .sort({ classAt: 1 }); // Sort by soonest class date first

        return res.status(200).json({
            success: true,
            count: batches.length,
            batches
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching batches",
            error: error.message
        });
    }
};

export const getAllSubmissionsOfProject = async (req, res) => {
    try {
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { projectId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const project = await Project.findOne({
            _id: projectId,
            mentorId: req.user._id,
            isDeleted: false
        }).populate("communityId", "name"); // ✅ Community has 'name', not 'title'

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or unauthorized"
            });
        }

        const submissions = await Submission.find({
            projectId,
            isDeleted: false
        })
            .populate("studentId", "name email")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            total: submissions.length,
            community: project.communityId?.name || null,
            data: submissions
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
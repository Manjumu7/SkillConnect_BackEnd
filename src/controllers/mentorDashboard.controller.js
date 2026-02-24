import mongoose from "mongoose";
import { Batch } from "../models/batch.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Project } from "../models/project.model.js";
import { Submission } from "../models/submission.model.js";
import { ProjectAssignment } from "../models/projectAssignment.model.js";

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

export const getMentorProjects = async (req, res) => {
    try {
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const userId = req.user._id;

        // 1️⃣ Get all communities where mentor is active
        const mentorEnrollments = await Enrollment.find({
            userId,
            role: "mentor",
            status: "active"
        }).select("communityId");

        if (!mentorEnrollments.length) {
            return res.status(200).json({
                success: true,
                count: 0,
                projects: []
            });
        }

        const communityIds = mentorEnrollments.map(e => e.communityId);

        // 2️⃣ Fetch projects from those communities
        const projects = await Project.find({
            communityId: { $in: communityIds },
            isDeleted: false
        })
            .populate("communityId", "name bannerImage")
            .populate("mentorId", "name profileImage")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const gradeSubmission = async (req, res) => {
    try {
        // 1️⃣ Role check
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { submissionId } = req.params;
        const { grade, feedback } = req.body;

        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid submission ID"
            });
        }

        // 2️⃣ Validate grade
        if (grade === undefined || grade < 0 || grade > 100) {
            return res.status(400).json({
                success: false,
                message: "Grade must be between 0 and 100"
            });
        }

        // 3️⃣ Find submission
        const submission = await Submission.findOne({
            _id: submissionId,
            isDeleted: false
        }).populate({
            path: "projectId",
            select: "communityId mentorId isDeleted"
        });

        if (!submission || !submission.projectId || submission.projectId.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Submission or project not found"
            });
        }

        const project = submission.projectId;

        // 4️⃣ Check mentor is assigned to that community
        const mentorEnrollment = await Enrollment.findOne({
            userId: req.user._id,
            communityId: project.communityId,
            role: "mentor",
            status: "active"
        });

        if (!mentorEnrollment) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this community"
            });
        }

        // 5️⃣ Prevent re-grading if already reviewed
        if (submission.status === "reviewed") {
            return res.status(400).json({
                success: false,
                message: "Submission already graded"
            });
        }

        // 6️⃣ Update submission
        submission.grade = grade;
        submission.feedback = feedback || "";
        submission.status = "reviewed";

        await submission.save();

        // 7️⃣ Update assignment status
        await ProjectAssignment.findOneAndUpdate(
            {
                projectId: submission.projectId._id,
                userId: submission.studentId
            },
            { status: "graded" }
        );

        return res.status(200).json({
            success: true,
            message: "Submission graded successfully",
            data: submission
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
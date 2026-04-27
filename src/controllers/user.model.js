import { User } from "../models/user.model.js"
import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Submission } from "../models/submission.model.js";
import { Project } from "../models/project.model.js";
import mongoose from "mongoose";export const getMyDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-expertise -friends -__v -updatedAt")
        if (!user) return res.status(404).json({ message: "User not found" })

        return res.status(200).json({ message: "Details fetched", user })
    } catch (error) {
        console.error("User Deyails", error)
        return res.status(500).json({ message: "Failed" })
    }
}

export const getMyDetailedProfile = async (req, res) => {
    try {
        const id = req.user._id;

        // Fetch user
        const user = await User.findById(id)
            .select("-password")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Fetch enrollments (communities)
        const enrollments = await Enrollment.find({
            userId: id,
            status: "active",
        })
            .populate("communityId", "name")
            .lean();

        const communities = enrollments
            .filter((e) => e.communityId)
            .map((e) => ({
                _id: e.communityId._id,
                name: e.communityId.name,
                role: e.role,
                joinedDate: e.createdAt,
            }));

        // Fetch all submissions
        const submissions = await Submission.find({
            studentId: id,
            isDeleted: false,
        })
            .populate("projectId", "title communityId")
            .sort({ createdAt: -1 })
            .lean();

        const totalSubmissions = submissions.length;
        const reviewedSubmissions = submissions.filter((s) => s.status === "reviewed");
        const totalScore = reviewedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
        const acceptanceRate = totalSubmissions > 0
            ? Math.round((reviewedSubmissions.length / totalSubmissions) * 100)
            : 0;

        // Difficulty breakdown: use grade ranges as proxy
        // Easy: grade >= 70, Medium: 40–69, Hard: < 40 (among reviewed)
        let easySolved = 0, mediumSolved = 0, hardSolved = 0;
        reviewedSubmissions.forEach((s) => {
            const g = s.grade || 0;
            if (g >= 70) easySolved++;
            else if (g >= 40) mediumSolved++;
            else hardSolved++;
        });

        // Compute rank in first community
        let communityRank = null;
        let totalInCommunity = null;
        if (communities.length > 0) {
            const primaryCommunityId = communities[0]._id;
            const peerEnrollments = await Enrollment.find({
                communityId: primaryCommunityId,
                role: "student",
                status: "active",
            }).select("userId").lean();

            const peerIds = peerEnrollments.map((e) => e.userId);

            const peerScores = await Submission.aggregate([
                {
                    $match: {
                        studentId: { $in: peerIds },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: "$studentId",
                        totalScore: { $sum: { $ifNull: ["$grade", 0] } },
                    },
                },
                { $sort: { totalScore: -1 } },
            ]);

            totalInCommunity = peerScores.length;
            const rankIdx = peerScores.findIndex(
                (p) => p._id.toString() === id.toString()
            );
            communityRank = rankIdx >= 0 ? rankIdx + 1 : totalInCommunity + 1;
        }

        // Recent submissions (last 10)
        const recentSubmissions = submissions.slice(0, 10).map((s) => ({
            _id: s._id,
            project: s.projectId?.title || "Unknown Project",
            status: s.status === "reviewed" ? "Accepted" : "Pending",
            grade: s.grade,
            date: s.createdAt,
        }));

        // Monthly progress (last 7 months)
        const progressData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthName = d.toLocaleString("en-US", { month: "short" });
            const count = submissions.filter(
                (s) => new Date(s.createdAt) >= d && new Date(s.createdAt) <= monthEnd
            ).length;
            progressData.push({ month: monthName, problemsSolved: count });
        }

        return res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                username: user.username || "",
                email: user.email,
                profileImage: user.profileImage || null,
                bio: user.bio || "",
                joinedDate: user.createdAt,
                communities,
                problemsSolved: {
                    total: totalSubmissions,
                    easy: easySolved,
                    medium: mediumSolved,
                    hard: hardSolved,
                },
                score: totalScore,
                submissions: totalSubmissions,
                acceptanceRate,
                communityRank,
                totalInCommunity,
                recentSubmissions,
                progressData,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
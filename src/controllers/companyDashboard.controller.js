import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Submission } from "../models/submission.model.js";
import { Project } from "../models/project.model.js";

// ─── GET /companydashboard/stats ────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    try {
        const { communityId } = req.query;

        // Build enrollment filter
        const enrollFilter = { role: "student", status: "active" };
        if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
            enrollFilter.communityId = new mongoose.Types.ObjectId(communityId);
        }

        // Get student enrollments
        const enrollments = await Enrollment.find(enrollFilter).select("userId").lean();
        const studentIds = [...new Set(enrollments.map((e) => e.userId.toString()))];

        // Total communities
        let totalCommunities;
        if (communityId) {
            totalCommunities = 1;
        } else {
            totalCommunities = await Community.countDocuments({ isDeleted: false });
        }

        // Total submissions by these students
        const totalSubmissions = studentIds.length > 0
            ? await Submission.countDocuments({
                studentId: { $in: studentIds },
                isDeleted: false,
            })
            : 0;

        // Active users in last 7 days (any user with a submission in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeUsers = studentIds.length > 0
            ? await Submission.distinct("studentId", {
                studentId: { $in: studentIds },
                createdAt: { $gte: sevenDaysAgo },
                isDeleted: false,
            }).then((ids) => ids.length)
            : 0;

        return res.json({
            success: true,
            stats: {
                totalStudents: studentIds.length,
                totalCommunities,
                totalProblemsSolved: totalSubmissions,
                activeUsers,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /companydashboard/leaderboard ──────────────────────────────
export const getLeaderboard = async (req, res) => {
    try {
        const { communityId, page = 1, limit = 10, sort = "desc" } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
        const sortDir = sort === "asc" ? 1 : -1;

        // Build enrollment match
        const enrollMatch = { role: "student", status: "active" };
        if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
            enrollMatch.communityId = new mongoose.Types.ObjectId(communityId);
        }

        // Get student IDs from enrollments
        const enrollments = await Enrollment.find(enrollMatch)
            .select("userId communityId")
            .populate("communityId", "name")
            .populate("userId", "name username email profileImage")
            .lean();

        if (enrollments.length === 0) {
            return res.json({
                success: true,
                leaderboard: [],
                total: 0,
                page: pageNum,
                pages: 0,
            });
        }

        const studentIds = enrollments.map((e) => e.userId?._id).filter(Boolean);

        // Aggregate submissions to compute score per student
        const scoreAgg = await Submission.aggregate([
            {
                $match: {
                    studentId: { $in: studentIds },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: "$studentId",
                    totalScore: { $sum: { $ifNull: ["$grade", 0] } },
                    submissionCount: { $sum: 1 },
                    reviewedCount: {
                        $sum: { $cond: [{ $eq: ["$status", "reviewed"] }, 1, 0] },
                    },
                },
            },
        ]);

        const scoreMap = {};
        scoreAgg.forEach((s) => {
            scoreMap[s._id.toString()] = {
                totalScore: s.totalScore,
                submissionCount: s.submissionCount,
                reviewedCount: s.reviewedCount,
            };
        });

        // Build leaderboard entries
        let leaderboard = enrollments.map((e) => {
            const userId = e.userId?._id?.toString();
            const scores = scoreMap[userId] || { totalScore: 0, submissionCount: 0, reviewedCount: 0 };
            return {
                userId: e.userId?._id,
                name: e.userId?.name || "Unknown",
                username: e.userId?.username || "",
                email: e.userId?.email || "",
                profileImage: e.userId?.profileImage || null,
                community: e.communityId?.name || "Unknown",
                communityId: e.communityId?._id,
                problemsSolved: scores.submissionCount,
                score: scores.totalScore,
            };
        });

        // Sort by score
        leaderboard.sort((a, b) => sortDir * (a.score - b.score));

        // Add ranks
        // For descending, rank 1 = highest score
        if (sortDir === -1) {
            leaderboard.forEach((entry, i) => (entry.rank = i + 1));
        } else {
            // ascending — rank 1 = lowest score
            leaderboard.forEach((entry, i) => (entry.rank = i + 1));
        }

        const total = leaderboard.length;
        const pages = Math.ceil(total / limitNum);

        // Paginate
        const start = (pageNum - 1) * limitNum;
        const paginated = leaderboard.slice(start, start + limitNum);

        return res.json({
            success: true,
            leaderboard: paginated,
            total,
            page: pageNum,
            pages,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /companydashboard/top-performers ───────────────────────────
export const getTopPerformers = async (req, res) => {
    try {
        // Reuse leaderboard logic with limit=3
        req.query.page = "1";
        req.query.limit = "3";
        req.query.sort = "desc";

        // Temporarily override res.json to intercept and rename
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            if (data.success) {
                return originalJson({
                    success: true,
                    topPerformers: data.leaderboard || [],
                });
            }
            return originalJson(data);
        };

        return getLeaderboard(req, res);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /companydashboard/search?q= ────────────────────────────────
export const searchStudents = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length === 0) {
            return res.json({ success: true, users: [] });
        }

        const regex = new RegExp(q.trim(), "i");

        const users = await User.find({
            role: "student",
            $or: [
                { name: regex },
                { username: regex },
                { email: regex },
            ],
        })
            .select("name username email profileImage")
            .limit(10)
            .lean();

        // For each user, find their enrolled communities
        const userIds = users.map((u) => u._id);
        const enrollments = await Enrollment.find({
            userId: { $in: userIds },
            role: "student",
            status: "active",
        })
            .populate("communityId", "name")
            .lean();

        const communityMap = {};
        enrollments.forEach((e) => {
            const uid = e.userId.toString();
            if (!communityMap[uid]) communityMap[uid] = [];
            if (e.communityId?.name) communityMap[uid].push(e.communityId.name);
        });

        const result = users.map((u) => ({
            _id: u._id,
            name: u.name,
            username: u.username || "",
            email: u.email,
            profileImage: u.profileImage || null,
            communities: communityMap[u._id.toString()] || [],
        }));

        return res.json({ success: true, users: result });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /companydashboard/student/:id ──────────────────────────────
export const getStudentProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid student ID" });
        }

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
                (p) => p._id.toString() === id
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

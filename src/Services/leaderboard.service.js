import mongoose from "mongoose";
import { Submission } from "../models/submission.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Project } from "../models/project.model.js";
import { Community } from "../models/community.modrl.js";

// ─── In-memory cache (swap for Redis in production at scale) ────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function cacheSet(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateCommunityCache(communityId) {
    const prefix = `lb:${communityId}`;
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
}

// ─── Main leaderboard aggregation ───────────────────────────────
export async function getLeaderboard(communityId, page = 1, limit = 10, currentUserId = null) {
    const cacheKey = `lb:${communityId}:${page}:${limit}`;
    const cached = cacheGet(cacheKey);
    if (cached && !currentUserId) return cached;
    // If cached but we need to attach currentUserRank, still use cached leaderboard
    if (cached && currentUserId) {
        const withUser = { ...cached };
        withUser.currentUserRank = await getCurrentUserRank(communityId, currentUserId);
        return withUser;
    }

    const communityObjId = new mongoose.Types.ObjectId(communityId);

    // Step 1: Get project IDs for this community (lightweight, uses communityId index)
    const projectIds = await Project.find({
        communityId: communityObjId,
        isDeleted: { $ne: true }
    }).distinct("_id");

    if (projectIds.length === 0) {
        const empty = { leaderboard: [], total: 0, page, limit, currentUserRank: null };
        cacheSet(cacheKey, empty);
        return empty;
    }

    // Step 2: Single optimized aggregation pipeline
    const pipeline = [
        // Match reviewed submissions from community projects
        {
            $match: {
                projectId: { $in: projectIds },
                status: "reviewed",
                isDeleted: { $ne: true },
                grade: { $type: "number" }
            }
        },
        // Group by student → compute totalScore + submissionsCount
        {
            $group: {
                _id: "$studentId",
                totalScore: { $sum: "$grade" },
                submissionsCount: { $sum: 1 }
            }
        },
        // Sort by totalScore descending (tie-break by _id for determinism)
        { $sort: { totalScore: -1, _id: 1 } },
        // Add rank using $setWindowFields (MongoDB 5.0+)
        {
            $setWindowFields: {
                sortBy: { totalScore: -1 },
                output: {
                    rank: { $rank: {} }
                }
            }
        },
        // Lookup user details (single $lookup, no N+1)
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    { $project: { name: 1, profileImage: 1, email: 1 } }
                ]
            }
        },
        // Flatten user doc
        { $unwind: "$user" },
        // Project final shape
        {
            $project: {
                _id: 0,
                userId: "$_id",
                name: "$user.name",
                profileImage: "$user.profileImage",
                email: "$user.email",
                totalScore: 1,
                submissionsCount: 1,
                rank: 1
            }
        },
        // Facet: paginated list + total count
        {
            $facet: {
                leaderboard: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                ],
                metadata: [
                    { $count: "total" }
                ]
            }
        }
    ];

    const [result] = await Submission.aggregate(pipeline);

    const leaderboard = result.leaderboard || [];
    const total = result.metadata?.[0]?.total || 0;

    const response = { leaderboard, total, page, limit, currentUserRank: null };

    // Cache the base result (without currentUserRank, which is user-specific)
    cacheSet(cacheKey, { leaderboard, total, page, limit, currentUserRank: null });

    // Resolve current user's rank
    if (currentUserId) {
        response.currentUserRank = await getCurrentUserRank(communityId, currentUserId);
    }

    return response;
}

// ─── Current user's rank (separate lightweight query) ───────────
async function getCurrentUserRank(communityId, userId) {
    const communityObjId = new mongoose.Types.ObjectId(communityId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const projectIds = await Project.find({
        communityId: communityObjId,
        isDeleted: { $ne: true }
    }).distinct("_id");

    if (projectIds.length === 0) return null;

    const pipeline = [
        {
            $match: {
                projectId: { $in: projectIds },
                status: "reviewed",
                isDeleted: { $ne: true },
                grade: { $type: "number" }
            }
        },
        {
            $group: {
                _id: "$studentId",
                totalScore: { $sum: "$grade" }
            }
        },
        { $sort: { totalScore: -1, _id: 1 } },
        {
            $setWindowFields: {
                sortBy: { totalScore: -1 },
                output: { rank: { $rank: {} } }
            }
        },
        { $match: { _id: userObjId } },
        { $project: { _id: 0, rank: 1, totalScore: 1 } }
    ];

    const [userRank] = await Submission.aggregate(pipeline);
    return userRank || null;
}

// ─── Student's enrolled communities ─────────────────────────────
export async function getUserCommunities(userId) {
    const enrollments = await Enrollment.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: "active"
    })
        .populate("communityId", "name bannerImage")
        .lean();

    return enrollments
        .filter(e => e.communityId) // guard against deleted communities
        .map(e => ({
            _id: e.communityId._id,
            name: e.communityId.name,
            bannerImage: e.communityId.bannerImage || null
        }));
}

// ─── Mentor's assigned communities ──────────────────────────────
export async function getMentorCommunities(userId) {
    const enrollments = await Enrollment.find({
        userId: new mongoose.Types.ObjectId(userId),
        role: "mentor",
        status: "active"
    })
        .populate("communityId", "name bannerImage")
        .lean();

    return enrollments
        .filter(e => e.communityId) // guard against deleted communities
        .map(e => ({
            _id: e.communityId._id,
            name: e.communityId.name,
            bannerImage: e.communityId.bannerImage || null
        }));
}

// ─── Admin: all active communities ──────────────────────────────
export async function getAllCommunities() {
    const communities = await Community.find({
        isDeleted: { $ne: true }
    })
        .select("name bannerImage")
        .sort({ name: 1 })
        .lean();

    return communities.map(c => ({
        _id: c._id,
        name: c.name,
        bannerImage: c.bannerImage || null
    }));
}

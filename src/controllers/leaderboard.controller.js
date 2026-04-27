import {
    getLeaderboard,
    getUserCommunities,
    getMentorCommunities,
    getAllCommunities
} from "../Services/leaderboard.service.js";

/**
 * GET /leaderboard?communityId=...&page=1&limit=10
 *
 * Returns paginated leaderboard for a community.
 * Score is computed dynamically from reviewed submission grades.
 * Access is enforced by the verifyCommunityAccess middleware (role-aware).
 */
export const getLeaderboardHandler = async (req, res) => {
    try {
        const { communityId, page = 1, limit = 10 } = req.query;

        if (!communityId) {
            return res.status(400).json({ message: "communityId is required" });
        }

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

        // Pass currentUserId only for students — admins/mentors have no personal rank entry
        const currentUserId = req.user.role === "student" ? req.user._id : null;

        const result = await getLeaderboard(
            communityId,
            parsedPage,
            parsedLimit,
            currentUserId
        );

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Leaderboard fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch leaderboard", error: error.message });
    }
};

/**
 * GET /leaderboard/communities
 *
 * Returns the list of communities relevant to the current user's role:
 *  - admin  → all communities
 *  - mentor → only communities they are assigned to
 *  - student → communities they are enrolled in (unchanged)
 */
export const getMyCommunitiesForLeaderboard = async (req, res) => {
    try {
        const { role, _id: userId } = req.user;

        let communities;

        if (role === "admin") {
            communities = await getAllCommunities();
        } else if (role === "mentor") {
            communities = await getMentorCommunities(userId);
        } else {
            // student (and any other role) — original behaviour unchanged
            communities = await getUserCommunities(userId);
        }

        return res.status(200).json({
            success: true,
            communities
        });
    } catch (error) {
        console.error("Communities fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch communities", error: error.message });
    }
};

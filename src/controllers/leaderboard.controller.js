import { getLeaderboard, getUserCommunities } from "../Services/leaderboard.service.js";

/**
 * GET /leaderboard?communityId=...&page=1&limit=10
 *
 * Returns paginated leaderboard for a community.
 * Score is computed dynamically from reviewed submission grades.
 */
export const getLeaderboardHandler = async (req, res) => {
    try {
        const { communityId, page = 1, limit = 10 } = req.query;

        if (!communityId) {
            return res.status(400).json({ message: "communityId is required" });
        }

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

        const result = await getLeaderboard(
            communityId,
            parsedPage,
            parsedLimit,
            req.user._id
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
 * Returns the list of communities the current user is enrolled in.
 * Used by the frontend dropdown to pick a community leaderboard.
 */
export const getMyCommunitiesForLeaderboard = async (req, res) => {
    try {
        const communities = await getUserCommunities(req.user._id);

        return res.status(200).json({
            success: true,
            communities
        });
    } catch (error) {
        console.error("Communities fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch communities", error: error.message });
    }
};

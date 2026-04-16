import { Enrollment } from "../models/enrollment.model.js";

/**
 * Middleware: verify the authenticated user is enrolled (active) in the
 * community identified by `req.query.communityId`.
 *
 * Uses Enrollment.exists() for a fast, index-backed boolean check.
 */
const verifyCommunityAccess = async (req, res, next) => {
    try {
        const { communityId } = req.query;

        if (!communityId) {
            return res.status(400).json({ message: "communityId query parameter is required" });
        }

        const isEnrolled = await Enrollment.exists({
            userId: req.user._id,
            communityId,
            status: "active"
        });

        if (!isEnrolled) {
            return res.status(403).json({
                message: "Access denied. You are not enrolled in this community."
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: "Community access check failed", error: error.message });
    }
};

export default verifyCommunityAccess;

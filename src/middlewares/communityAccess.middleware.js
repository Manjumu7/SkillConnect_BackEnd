import { Enrollment } from "../models/enrollment.model.js";

/**
 * Middleware: verify the authenticated user has access to the community
 * identified by `req.query.communityId`.
 *
 * Role-based logic:
 *  - admin  → always allowed (no enrollment required)
 *  - mentor → must have an active Enrollment with role:"mentor" in that community
 *  - student → must have an active Enrollment (any role) in that community (original behaviour)
 */
const verifyCommunityAccess = async (req, res, next) => {
    try {
        const { communityId } = req.query;

        if (!communityId) {
            return res.status(400).json({ message: "communityId query parameter is required" });
        }

        const { role, _id: userId } = req.user;

        // ── Admin: unrestricted access ──────────────────────────────────────
        if (role === "admin") {
            return next();
        }

        // ── Mentor: must be assigned to the community ───────────────────────
        if (role === "mentor") {
            const isAssigned = await Enrollment.exists({
                userId,
                communityId,
                role: "mentor",
                status: "active"
            });

            if (!isAssigned) {
                return res.status(403).json({
                    message: "Access denied. You are not assigned to this community."
                });
            }

            return next();
        }

        // ── Student (and any other role): original enrollment check ─────────
        const isEnrolled = await Enrollment.exists({
            userId,
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

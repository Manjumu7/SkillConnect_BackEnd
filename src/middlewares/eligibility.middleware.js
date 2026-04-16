import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { Submission } from "../models/submission.model.js";

const MINIMUM_SCORE = 60;

/**
 * Eligibility middleware for certificate generation.
 * Computes the student's total score for a specific community
 * by summing grades from all reviewed submissions on that community's projects.
 * Blocks the request if total score < 60.
 *
 * Expects `communityId` in req.body (for POST /generate).
 */
const checkEligibility = async (req, res, next) => {
    try {
        const communityId = req.body.communityId || req.params.communityId;

        if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: "Valid communityId is required for eligibility check" });
        }

        const userId = req.user._id;

        // Find all non-deleted projects belonging to this community
        const projects = await Project.find({ communityId, isDeleted: false }).select("_id");
        const projectIds = projects.map(p => p._id);

        if (projectIds.length === 0) {
            return res.status(403).json({
                message: "No projects found in this community",
                score: 0,
                requiredScore: MINIMUM_SCORE
            });
        }

        // Aggregate reviewed submission grades for this student
        const result = await Submission.aggregate([
            {
                $match: {
                    studentId: new mongoose.Types.ObjectId(userId),
                    projectId: { $in: projectIds },
                    status: "reviewed",
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: "$grade" }
                }
            }
        ]);

        const score = result.length > 0 ? result[0].totalScore : 0;

        if (score < MINIMUM_SCORE) {
            return res.status(403).json({
                message: `Score must be at least ${MINIMUM_SCORE} to access certificates`,
                currentScore: score,
                requiredScore: MINIMUM_SCORE
            });
        }

        // Attach computed score for downstream controllers
        req.communityScore = score;
        next();
    } catch (error) {
        return res.status(500).json({ message: "Eligibility check failed", error: error.message });
    }
};

export default checkEligibility;

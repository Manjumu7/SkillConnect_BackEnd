import { User } from "../models/user.model.js";

const MINIMUM_SCORE = 60;

const checkEligibility = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("score name email");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.score <= MINIMUM_SCORE) {
            return res.status(403).json({
                message: "Score must be greater than 60 to access certificates",
                currentScore: user.score,
                requiredScore: MINIMUM_SCORE + 1
            });
        }

        // Attach user doc for downstream controllers
        req.userDoc = user;
        next();
    } catch (error) {
        return res.status(500).json({ message: "Eligibility check failed", error: error.message });
    }
};

export default checkEligibility;

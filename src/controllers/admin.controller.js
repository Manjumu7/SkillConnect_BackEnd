import { Enrollment } from "../models/enrollment.model.js"
import { User } from "../models/user.model.js"

export const getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admins only" })
        }

        const students = await User.find().sort({ createdAt: 1 })

        return res.status(200).json({ message: "Fetched all students", students })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Failed to fetch students" })
    }
}

export const getPendingMentors = async (req, res) => {
    try {
        const mentors = await User.find({
            mentorStatus: "pending"
        })
            .select("name email expertise experience_years resume createdAt")
            .lean();

        return res.status(200).json({
            success: true,
            count: mentors.length,
            mentors
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending mentors"
        });
    }
};

export const approveMentor = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                mentorStatus: "approved",
                role: "mentor"
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Mentor approved"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Approval failed"
        });
    }
};


export const rejectMentor = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // ❌ Cannot reject approved mentor
        if (user.mentorStatus === "approved") {
            return res.status(400).json({
                success: false,
                message: "Cannot reject an approved mentor"
            });
        }

        // ❌ Cannot reject if not pending
        if (user.mentorStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending applications can be rejected"
            });
        }

        // ✅ Perform rejection
        user.mentorStatus = "rejected";
        user.mentorRejectionReason = reason.trim();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Mentor application rejected successfully"
        });

    } catch (error) {
        console.error("Reject mentor error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject mentor"
        });
    }
}

export const getActiveMentors = async (req, res) => {
    try {
        const mentors = await User.aggregate([
            { $match: { role: "mentor", mentorStatus: "approved" } },
            {
                $lookup: {
                    from: "enrollments",
                    localField: "_id",
                    foreignField: "userId",
                    as: "enrollments"
                }
            },
            {
                $lookup: {
                    from: "communities",
                    localField: "enrollments.communityId",
                    foreignField: "_id",
                    as: "communityData"
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    name: 1,
                    email: 1,
                    // This creates the array of community names for the UI
                    communities: "$communityData.name",
                    totalCommunities: { $size: "$communityData" }
                }
            }
        ]);
        res.status(200).json({ success: true, mentors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
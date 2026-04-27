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
                    updatedAt: 1,
                    // This creates the array of community names for the UI
                    communities: "$communityData.name",
                    communityIds: "$communityData._id",
                    totalCommunities: { $size: "$communityData" }
                }
            }
        ]);
        res.status(200).json({ success: true, mentors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllStudents = async (req, res) => {
    try {
        const students = await Enrollment.find({ role: "student" })
            .populate("userId", "name email profileImage plan")
            .populate("communityId", "name")
            .lean();

        // Normalize into the shape the frontend expects:
        // user[] and community[] arrays (matching what Compass shows)
        const normalized = students.map(e => ({
            ...e,
            user: e.userId ? [e.userId] : [],
            community: e.communityId ? [e.communityId] : [],
        }));

        return res.status(200).json({
            message: "Fetched all students",
            students: normalized
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server fat gaya" });
    }
};

export const toggleBanStudent = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: "Enrollment not found" });
        }

        enrollment.status = enrollment.status === "banned" ? "active" : "banned";
        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: `Student ${enrollment.status === "banned" ? "banned" : "unbanned"} successfully`,
            status: enrollment.status
        });

    } catch (error) {
        console.error("toggleBanStudent error:", error);
        return res.status(500).json({ success: false, message: "Failed to update student status" });
    }
};


// ══════════════════════════════════════════════════════════════════
// COMPANY MANAGEMENT
// ══════════════════════════════════════════════════════════════════

export const getPendingCompanies = async (req, res) => {
    try {
        const companies = await User.find({
            companyStatus: "pending"
        })
            .select("name email company_name company_website company_industry company_description createdAt")
            .lean();

        return res.status(200).json({
            success: true,
            count: companies.length,
            companies
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending companies"
        });
    }
};

export const approveCompany = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                companyStatus: "approved",
                role: "company"
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
            message: "Company approved"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Approval failed"
        });
    }
};

export const rejectCompany = async (req, res) => {
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

        if (user.companyStatus === "approved") {
            return res.status(400).json({
                success: false,
                message: "Cannot reject an approved company"
            });
        }

        if (user.companyStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending applications can be rejected"
            });
        }

        user.companyStatus = "rejected";
        user.companyRejectionReason = reason.trim();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Company application rejected successfully"
        });

    } catch (error) {
        console.error("Reject company error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject company"
        });
    }
};

export const getActiveCompanies = async (req, res) => {
    try {
        const companies = await User.find({
            role: "company",
            companyStatus: "approved"
        })
            .select("name email company_name company_website company_industry company_description createdAt")
            .lean();

        return res.status(200).json({
            success: true,
            count: companies.length,
            companies
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch active companies"
        });
    }
};



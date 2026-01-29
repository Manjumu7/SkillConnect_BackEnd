import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { User } from "../models/user.model.js";

export const enrollMentor = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Access denied" });

        const { communityId } = req.params;
        const { userId, role, plan } = req.body;

        if (!userId || !communityId)
            return res.status(400).json({ message: "userId and communityId required" });

        const user = await User.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });

        if (user.role !== "mentor")
            return res.status(400).json({ message: "User is not a mentor" });

        const community = await Community.findOne({ _id: communityId, isDeleted: false });
        if (!community)
            return res.status(404).json({ message: "Community not found" });

        const exists = await Enrollment.findOne({ userId, communityId });
        if (exists) return res.status(409).json({ message: "Already enrolled" });

        const enrollment = await Enrollment.create({ userId, communityId, role, plan });

        await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: 1 } });

        res.status(201).json({ success: true, enrollment });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getCommunityMembers = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { communityId } = req.params;
        if (!communityId)
            return res.status(400).json({ message: "Community ID required" });

        const community = await Community.findOne({ _id: communityId, isDeleted: false });
        if (!community)
            return res.status(404).json({ message: "Community not found" });

        const members = await Enrollment.find({ communityId })
            .populate("userId", "name email role");

        res.json({
            success: true,
            membersCount: members.length,
            members,
            coummunity: community.name
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserCommunities = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId } = req.params;
        if (!userId) return res.status(400).json({ message: "User ID required" });

        const enrollments = await Enrollment.find({ userId })
            .populate("communityId", "name description visibility");

        res.json({ success: true, communities: enrollments });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const removeUserFromCommunity = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { communityId, userId } = req.params;

        const enrollment = await Enrollment.findOneAndDelete({ userId, communityId });
        if (!enrollment)
            return res.status(404).json({ message: "Enrollment not found" });

        await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: -1 } });

        res.json({ success: true, message: "User removed from community" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const enrollInCommunity = async (req, res) => {
    try {
        if (req.user.role !== "student")
            return res.status(403).json({ message: "Only students can enroll" });

        const { communityId } = req.params;
        const userId = req.user._id;

        if (!communityId)
            return res.status(400).json({ message: "communityId required" });

        const community = await Community.findOne({
            _id: communityId,
            isDeleted: false,
            visibility: "public"
        })

        if (!community)
            return res.status(404).json({ message: "Community not found or private" });

        const exists = await Enrollment.findOne({ userId, communityId });
        if (exists)
            return res.status(409).json({ message: "Already enrolled" });

        const enrollment = await Enrollment.create({
            userId,
            communityId,
            role: "student",
            plan: "free"
        });

        await Community.findByIdAndUpdate(communityId, {
            $inc: { membersCount: 1 }
        });

        res.status(201).json({ success: true, enrollment });

    } catch (err) {
        console.error(error)
        res.status(500).json({ message: err.message });
    }
};

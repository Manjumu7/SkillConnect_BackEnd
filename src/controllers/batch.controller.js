import mongoose from "mongoose";
import { Batch } from "../models/batch.model.js";
import { Community } from "../models/community.modrl.js";
import { Enrollment } from "../models/enrollment.model.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";


export const createBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { communityId } = req.params;
        const { name, classAt, description, classLink, mentorId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(communityId)) {
            return res.status(400).json({ success: false, message: "Invalid community ID" });
        }

        if (!name || !classAt) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const parsedDate = new Date(classAt);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid class date" });
        }

        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ success: false, message: "Community not found" });
        }

        let finalMentorId;

        if (req.user.role === "admin") {
            if (!mentorId || !mongoose.Types.ObjectId.isValid(mentorId)) {
                return res.status(400).json({ success: false, message: "Valid mentorId required" });
            }

            const mentorUser = await User.findById(mentorId);
            if (!mentorUser || mentorUser.role !== "mentor") {
                return res.status(400).json({ success: false, message: "Invalid mentor" });
            }

            finalMentorId = mentorId;

        } else {
            finalMentorId = req.user._id;

            // Ensure mentor is enrolled in this community
            const mentorEnrollment = await Enrollment.findOne({
                userId: req.user._id,
                communityId,
                role: "mentor",
                status: "active"
            });

            if (!mentorEnrollment) {
                return res.status(403).json({ success: false, message: "Not assigned to this community" });
            }
        }

        let bannerImage = "";
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "batches");
            bannerImage = result.secure_url;
        }

        const batch = await Batch.create({
            name,
            description,
            classAt: parsedDate,
            classLink,
            bannerImage,
            communityId,
            mentorId: finalMentorId
        });

        const populatedBatch = await Batch.findById(batch._id)
            .populate("communityId", "name bannerImage")
            .populate("mentorId", "name email profileImage");

        return res.status(201).json({
            success: true,
            batch: populatedBatch ?? batch
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};


export const getAllBatches = async (req, res) => {
    try {
        const query = {};

        if (req.user.role === "student") {
            query.isDeleted = false;
        }

        const batches = await Batch.find(query)
            .populate("mentorId", "name email")
            .populate("communityId", "name")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: batches.length,
            batches
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};



export const updateBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { name, description, classAt, classLink, status, mentorId } = req.body;

        const batch = await Batch.findOne({ _id: batchId, isDeleted: false });
        if (!batch) return res.status(404).json({ message: "Batch not found" });

        // Build the update object carefully
        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (classAt) updateData.classAt = classAt;
        if (classLink) updateData.classLink = classLink;
        if (mentorId) updateData.mentorId = mentorId;
        if (status && req.user.role === "admin") updateData.status = status;

        // ONLY upload if a NEW file is provided
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, "batches");
                updateData.bannerImage = result.secure_url;
            } catch (uploadError) {
                return res.status(500).json({ message: "Banner upload failed" });
            }
        }

        const updated = await Batch.findByIdAndUpdate(batchId, updateData, {
            new: true,
            runValidators: true
        })
            .populate("communityId", "name bannerImage")
            .populate("mentorId", "name email profileImage");

        res.json({ success: true, batch: updated });

    } catch (err) {
        console.error("Update Batch Error:", err);
        res.status(500).json({ message: err.message });
    }
};

export const deleteBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await Batch.findById(batchId);

        if (!batch) {
            return res.status(404).json({ success: false, message: "Batch not found" });
        }

        // Mentor security check: Ensure mentorId exists before calling toString()
        if (req.user.role === "mentor") {
            if (!batch.mentorId || batch.mentorId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: "Not assigned to this batch" });
            }
        }

        // Toggle delete status
        batch.isDeleted = !batch.isDeleted;
        await batch.save();

        res.json({
            success: true,
            message: batch.isDeleted ? "Batch successfully deactivated" : "Batch successfully restored",
            isDeleted: batch.isDeleted // Return the new state
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const removeStudentFromBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { communityId, userId } = req.params;

        const enrollment = await Enrollment.findOne({ userId, communityId });
        if (!enrollment || !enrollment.batchId)
            return res.status(404).json({ message: "Student not in any batch" });

        const batch = await Batch.findById(enrollment.batchId);
        if (!batch || batch.isDeleted)
            return res.status(404).json({ message: "Batch not found" });

        if (
            req.user.role === "mentor" &&
            batch.mentorId.toString() !== req.user._id.toString()
        )
            return res.status(403).json({ message: "Not your batch" });

        enrollment.batchId = null;
        await enrollment.save();

        res.json({ success: true, message: "Student removed from batch" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const upgradeToPro = async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user._id;

        const enrollment = await Enrollment.findOne({
            userId,
            communityId,
            role: "student",
            status: "active"
        });

        if (!enrollment) {
            return res.status(404).json({ message: "Enrollment not found" });
        }

        enrollment.plan = "pro";

        // Assign latest batch if exists
        const latestBatch = await Batch.findOne({
            communityId,
            isDeleted: false
        }).sort({ createdAt: -1 });

        if (latestBatch) {
            enrollment.batchId = latestBatch._id;
        }

        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: "Upgraded to pro successfully"
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const getMyBatches = async (req, res) => {
    try {
        const userId = req.user._id;

        const enrollments = await Enrollment.find({ userId }).select("batchId");

        if (!enrollments.length)
            return res.json({ success: true, batches: [] });

        const batchIds = enrollments
            .map(e => e.batchId)
            .filter(Boolean);

        const batches = await Batch.find({ _id: { $in: batchIds } })
            .populate("mentorId", "name email")
            .populate("communityId", "name");

        res.json({ success: true, count: batches.length, batches });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const AllBatchedOfACommunity = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(400).json({ message: "Admins only" })
        const { communityId } = req.params;

        if (!communityId) return res.status(400).json({ message: "CommunityID is required" })

        const community = await Community.findById(communityId)
        if (!community) return res.status(404).json({ message: "Community not found" })

        // This fetches EVERYTHING including isDeleted: true
        const batches = await Batch.find({ communityId })
            .sort({ createdAt: -1 })
            .populate("communityId", "title description visibility")
            .populate("mentorId", "name")

        return res.status(200).json({
            success: true,
            message: "Fetched all batches",
            count: batches.length,
            batches // frontend will check batch.isDeleted here
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Failed to fetch batches" })
    }
}


export const getMentorCommunityBatches = async (req, res) => {
    try {
        if (req.user.role !== "mentor") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // 1️⃣ Get mentor's active community enrollments
        const mentorEnrollments = await Enrollment.find({
            userId: req.user._id,
            role: "mentor",
            status: "active"
        }).select("communityId");

        if (!mentorEnrollments.length) {
            return res.status(200).json({
                success: true,
                count: 0,
                batches: []
            });
        }

        // 2️⃣ Extract community IDs
        const communityIds = mentorEnrollments.map(e => e.communityId);

        // 3️⃣ Fetch batches only from assigned communities
        const batches = await Batch.find({
            communityId: { $in: communityIds },
            isDeleted: false
        })
            .populate("communityId", "name")
            .populate("mentorId", "name email")
            .sort({ classAt: 1 });

        return res.status(200).json({
            success: true,
            count: batches.length,
            batches
        });

    } catch (err) {
        console.error("Get Mentor Batches Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch batches"
        });
    }
};
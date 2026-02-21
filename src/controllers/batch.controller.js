import { Batch } from "../models/batch.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";


export const createBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { communityId } = req.params;
        const { name, classAt, description, classLink, mentorId } = req.body;

        if (!name || !classAt || !communityId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let finalMentorId;

        // Mentor validation
        if (req.user.role === "mentor") {
            const isMentor = await Enrollment.findOne({
                userId: req.user._id,
                communityId,
                role: "mentor",
                status: "active"
            });

            if (!isMentor) {
                return res.status(403).json({
                    message: "You are not an active mentor of this community"
                });
            }

            finalMentorId = req.user._id;
        }

        // Admin validation
        if (req.user.role === "admin") {
            if (!mentorId) {
                return res.status(400).json({
                    message: "mentorId is required when admin creates batch"
                });
            }

            const validMentor = await Enrollment.findOne({
                userId: mentorId,
                communityId,
                role: "mentor",
                status: "active"
            });

            if (!validMentor) {
                return res.status(400).json({
                    message: "Selected user is not an active mentor of this community"
                });
            }

            finalMentorId = mentorId;
        }

        // 🔥 Ensure only one active batch per community
        await Batch.updateMany(
            {
                communityId,
                isDeleted: false
            },
            {
                $set: { isDeleted: true }
            }
        );

        let bannerImage;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "batches");
            bannerImage = result.secure_url;
        }

        const batch = await Batch.create({
            name,
            classAt,
            description,
            classLink,
            bannerImage,
            communityId,
            mentorId: finalMentorId
        });

        // Assign new batch to all active pro students
        await Enrollment.updateMany(
            {
                communityId,
                role: "student",
                plan: "pro",
                status: "active"
            },
            {
                $set: { batchId: batch._id }
            }
        );

        return res.status(201).json({
            success: true,
            batch
        });

    } catch (err) {
        console.error("Create batch error:", err);
        return res.status(500).json({
            message: err.message
        });
    }
};


export const getAllBatches = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const batches = await Batch.find()
            .populate("mentorId", "name email role")
            .populate("communityId", "name");

        res.json({ success: true, count: batches.length, batches });

    } catch (err) {
        res.status(500).json({ message: err.message });
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

export const updateBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { batchId } = req.params;
        const { name, description, classAt, classLink, status } = req.body;

        const batch = await Batch.findOne({ _id: batchId, isDeleted: false });
        if (!batch) return res.status(404).json({ message: "Batch not found" });

        if (
            req.user.role === "mentor" &&
            batch.mentorId.toString() !== req.user._id.toString()
        )
            return res.status(403).json({ message: "Not assigned to this batch" });

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (classAt) updateData.classAt = classAt;
        if (classLink) updateData.classLink = classLink;
        if (status && req.user.role === "admin") updateData.status = status;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "batches");
            updateData.bannerImage = result.secure_url;
        }

        if (!Object.keys(updateData).length)
            return res.status(400).json({ message: "No valid fields to update" });

        const updated = await Batch.findByIdAndUpdate(batchId, updateData, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, batch: updated });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { batchId } = req.params;

        const batch = await Batch.findById(batchId);
        if (!batch || batch.isDeleted) return res.status(404).json({ message: "Batch not found" });

        if (req.user.role === "mentor" && batch.mentorId.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Not assigned to this batch" });

        batch.isDeleted = true;
        await batch.save();

        res.json({ success: true, message: "Batch deleted" });

    } catch (err) {
        res.status(500).json({ message: err.message });
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
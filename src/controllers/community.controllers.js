import { Community } from "../models/community.modrl.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const createCommunity = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Access denied" });

        const { name, description, visibility } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });

        const exists = await Community.findOne({ name, isDeleted: false });
        if (exists) return res.status(409).json({ message: "Community already exists" });

        let bannerImage;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "communities");
            bannerImage = result.secure_url;
        }

        const community = await Community.create({
            name,
            description,
            visibility,
            bannerImage,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, community });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllCommunities = async (req, res) => {
    try {
        const { visibility } = req.query;

        const filter = { isDeleted: false };
        if (visibility) filter.visibility = visibility;

        const communities = await Community.find(filter).sort({ createdAt: -1 });

        res.json({ success: true, communities });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getCommunityById = async (req, res) => {
    try {
        const { id } = req.params;

        const community = await Community.findOne({ _id: id, isDeleted: false });
        if (!community) return res.status(404).json({ message: "Community not found" });

        res.json({ success: true, community });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateCommunity = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Access denied" });

        const { id } = req.params;
        const { name, description, visibility } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (visibility) updateData.visibility = visibility;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "communities");
            updateData.bannerImage = result.secure_url;
        }

        if (!Object.keys(updateData).length)
            return res.status(400).json({ message: "No valid fields to update" });

        const community = await Community.findOneAndUpdate(
            { _id: id, isDeleted: false },
            updateData,
            { new: true, runValidators: true }
        );

        if (!community)
            return res.status(404).json({ message: "Community not found" });

        res.json({ success: true, community });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const deleteCommunity = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Access denied" });

        const { id } = req.params;

        const community = await Community.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!community) return res.status(404).json({ message: "Community not found" });

        res.json({ success: true, message: "Community deleted" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

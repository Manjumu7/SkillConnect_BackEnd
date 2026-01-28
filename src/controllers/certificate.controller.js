import { Certificate } from "../models/certificate.model.js";

export const createCertificate = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId, communityId } = req.body;
        if (!userId || !communityId)
            return res.status(400).json({ message: "userId and communityId required" });

        const exists = await Certificate.findOne({ userId, communityId });
        if (exists)
            return res.status(409).json({ message: "Certificate already issued" });

        const certificate = await Certificate.create({ userId, communityId });

        res.status(201).json({ success: true, certificate });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllCertificates = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const certificates = await Certificate.find()
            .populate("userId", "name email")
            .populate("communityId", "name");

        res.json({ success: true, count: certificates.length, certificates });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getCertificateById = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { id } = req.params;

        const certificate = await Certificate.findById(id)
            .populate("userId", "name email")
            .populate("communityId", "name");

        if (!certificate)
            return res.status(404).json({ message: "Certificate not found" });

        res.json({ success: true, certificate });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



export const deleteCertificate = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { id } = req.params;

        const certificate = await Certificate.findByIdAndDelete(id);
        if (!certificate)
            return res.status(404).json({ message: "Certificate not found" });

        res.json({ success: true, message: "Certificate removed" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const getUserCertificates = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const { userId } = req.params;

        const certificates = await Certificate.find({ userId })
            .populate("communityId", "name");

        res.json({ success: true, certificates });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



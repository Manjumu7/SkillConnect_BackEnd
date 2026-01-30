import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Company } from "../models/company.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const roleGuard = (user) => {
    if (!user || user.role !== "company") {
        throw new Error("Unauthorized");
    }
};

const getResourceType = (mimetype) => {
    if (mimetype.startsWith("image")) return "image";
    if (mimetype.startsWith("video")) return "video";
    return "raw";
};

const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    const file = parts[parts.length - 1];
    return file.split(".")[0];
};

export const createCompany = async (req, res) => {
    try {
        roleGuard(req.user);

        const {
            company_name,
            description,
            website,
            email,
            industry_type,
            hiring_Requirment
        } = req.body;

        if (!company_name || !description || !email || !industry_type || !hiring_Requirment) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let bannerImage;

        if (req.file) {
            const upload = await uploadToCloudinary(
                req.file.buffer,
                "companies/banners",
                getResourceType(req.file.mimetype)
            );
            bannerImage = upload.secure_url;
        }

        const company = await Company.create({
            company_name,
            description,
            website,
            email,
            industry_type,
            hiring_Requirment,
            bannerImage
        });

        return res.status(201).json({ success: true, data: company });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "Company already exists" });
        }
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        const { page = 1, limit = 10, industry_type } = req.query;

        const filter = { isDeleted: false };
        if (industry_type) filter.industry_type = industry_type;

        const skip = (page - 1) * limit;

        const [companies, total] = await Promise.all([
            Company.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),

            Company.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: companies
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const company = await Company.findOne({
            _id: id,
            isDeleted: false
        });

        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        return res.json({ success: true, data: company });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const updateCompany = async (req, res) => {
    try {
        roleGuard(req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const company = await Company.findOne({
            _id: id,
            isDeleted: false
        });

        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        if (req.file) {
            if (company.bannerImage) {
                const publicId = extractPublicId(company.bannerImage);
                if (publicId) {
                    await cloudinary.uploader.destroy(`companies/banners/${publicId}`);
                }
            }

            const upload = await uploadToCloudinary(
                req.file.buffer,
                "companies/banners",
                getResourceType(req.file.mimetype)
            );
            company.bannerImage = upload.secure_url;
        }

        Object.assign(company, req.body);
        await company.save();

        return res.json({ success: true, data: company });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

export const softDeleteCompany = async (req, res) => {
    try {
        roleGuard(req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const company = await Company.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        return res.json({ success: true, message: "Company deleted successfully" });
    } catch (err) {
        return res.status(err.message === "Unauthorized" ? 403 : 500).json({
            success: false,
            message: err.message
        });
    }
};

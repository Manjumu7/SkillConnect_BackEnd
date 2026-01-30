import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    company_name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    website: {
        type: String,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    industry_type: {
        type: String,
        trim: true,
        required: true
    },

    hiring_Requirment: [
        {
            type: String,
            required: true,
            trim: true
        }
    ],

    bannerImage: { type: String },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }

}, { timestamps: true });

export const Company = mongoose.model("Company", companySchema);

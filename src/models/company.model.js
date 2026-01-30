import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    company_name: {
        type: String,
        required: true
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

    bannerImage: { type: String }  // Cloudinary URL

}, { timestamps: true })

export const company = mongoose.model("company", companySchema)

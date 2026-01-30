import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },

    description: { type: String, trim: true },

    classAt: { type: Date, required: true },

    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    status: {
        type: String,
        enum: ["upcoming", "ongoing", "completed"],
        default: "upcoming"
    },

    classLink: { type: String },

    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true,
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    bannerImage: { type: String }  // Cloudinary URL


}, { timestamps: true });

export const Batch = mongoose.model("Batch", batchSchema);

import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },

    bannerImage: { type: String }, // Cloudinary URL

    dueDate: {
        type: Date,
        required: true,
        index: true
    },

    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true,
        index: true
    },

    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        default: null,
        index: true
    },

    status: {
        type: String,
        enum: ["open", "closed", "archived"],
        default: "open"
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }

}, { timestamps: true });

export const Project = mongoose.model("Project", projectSchema);

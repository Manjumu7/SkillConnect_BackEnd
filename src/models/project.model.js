import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    due_date: { type: Date, required: true },

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

    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open"
    },

    isDeleted: { type: Boolean, default: false }

}, { timestamps: true });

export const Project = mongoose.model("Project", projectSchema);

import mongoose from "mongoose";

const projectAssignmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["assigned", "submitted", "graded"],
        default: "assigned"
    },
    submittedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

projectAssignmentSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export const ProjectAssignment = mongoose.model("ProjectAssignment", projectAssignmentSchema);
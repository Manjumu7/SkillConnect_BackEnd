import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
    userId: {
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

    role: {
        type: String,
        enum: ["student", "mentor", "admin"],
        default: "student",
        index: true
    },

    plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free"
    },

    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch"
    },

    status: {
        type: String,
        enum: ["active", "cancelled", "banned"],
        default: "active"
    }

}, { timestamps: true });

enrollmentSchema.index({ userId: 1, communityId: 1 }, { unique: true });

// Compound index for leaderboard middleware & community member queries
enrollmentSchema.index({ communityId: 1, role: 1, status: 1 });

export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

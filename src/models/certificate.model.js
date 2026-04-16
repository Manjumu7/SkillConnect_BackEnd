import mongoose from "mongoose";
import crypto from "crypto";

const certificateSchema = new mongoose.Schema({
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

    courseName: {
        type: String,
        required: true,
        trim: true
    },

    certificateId: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },

    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    issuedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

certificateSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export const Certificate = mongoose.model("Certificate", certificateSchema);
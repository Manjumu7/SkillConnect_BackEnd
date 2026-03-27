import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const certificateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
    },

    certificateId: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },

    courseName: {
        type: String,
        required: true
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
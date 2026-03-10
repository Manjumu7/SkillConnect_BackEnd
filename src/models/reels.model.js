import mongoose from "mongoose";

const reelSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        lowercase: true,
        trim: true
    },
    videoUrl: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: []
        }
    ],
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            text: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    tags: [
        {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        }
    ],
    category: {
        type: String,
        lowercase: true,
        trim: true,
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }

}, { timestamps: true });

reelSchema.index({ createdAt: -1 });

export const Reel = mongoose.model("Reel", reelSchema);


import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    topics: [
        {
            type: String,
            trim: true
        }
    ]

}, { timestamps: true });

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        trim: true
    },

    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },

    membersCount: {
        type: Number,
        default: 0,
    },

    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public",
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },

    bannerImage: {
        type: String
    },

    // 🔥 NEW FIELD
    modules: [moduleSchema]

}, { timestamps: true });

export const Community = mongoose.model("Community", communitySchema);

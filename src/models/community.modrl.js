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
    ],

    youtubeUrl: { type: String }

}, { timestamps: true });

const communitySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    mentors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }],

    membersCount: { type: Number, default: 0 },

    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    },

    price: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    bannerImage: String,
    modules: [moduleSchema]

}, { timestamps: true });

export const Community = mongoose.model("Community", communitySchema);

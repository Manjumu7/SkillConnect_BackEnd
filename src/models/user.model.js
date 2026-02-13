import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // Core identity fields used by SkillConnect
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    // Shared role field used by both SkillConnect and Reelr features
    role: {
        type: String,
        enum: ["student", "mentor", "admin", "company", "viewer", "creator"],
        default: "student",
        index: true
    },

    // Subscription / plan (SkillConnect)
    plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free"
    },

    phone: {
        type: Number,
        required: true
    },

    resume: {
        type: String
    },

    experience_years: {
        type: Number,
        min: 0
    },

    expertise: [
        {
            type: String
        }
    ],

    // Profile fields primarily used by the Reelr-style features
    username: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },

    fullName: {
        type: String,
        lowercase: true
    },

    profileImage: {
        type: String
    },

    coverImage: {
        type: String
    },

    // Keep existing longer bio constraint; Reelr uses it as well
    bio: {
        type: String,
        maxlength: 700,
        trim: true
    },

    // Friends graph for social features
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]

}, { timestamps: true })

export const User = mongoose.model("User", userSchema)
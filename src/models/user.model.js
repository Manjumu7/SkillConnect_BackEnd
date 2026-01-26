import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
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

    role: {
        type: String,
        enum: ["student", "mentor", "admin", "company"],
        default: "student",
        index: true
    },

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

    bio: {
        type: String,
        maxlength: 700
    }

}, { timestamps: true })

export const User = mongoose.model("User", userSchema)
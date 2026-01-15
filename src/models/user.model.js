import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        role: String,
        enum: ["user", "mentor", "company", "admin"],
        default:"user"
    },
}, { timestamps: true })

export const User = mongoose.model("User", userSchema)
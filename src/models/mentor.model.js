import mongoose from "mongoose";

const mentorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },

    password: {
        type: String,
        required: true
    },

    resume: {
        type: String,
        required: true
    },

    experience_years: {
        type: String,
        required: true
    },

    expertise: [
        {
            type: String
        }
    ],

    phone: {
        type: Number,
        required: true
    },

    //Address????

    bio: {
        type: String,
        maxlength: 700
    }
}, { timestamps: true })

export const Mentor = mongoose.model("Mentor", mentorSchema)
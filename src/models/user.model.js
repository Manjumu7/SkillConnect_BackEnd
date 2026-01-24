import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
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
        type: String,
        enum: ["user", "mentor", "company", "admin"],
        default:"user"
    },
    learner_type:{
        type: String,
        enum: ["self", "paid"],
        default: "self"
    },

    phone:{
        type:Number,
        required:true
    }
}, { timestamps: true })

export const User = mongoose.model("User", userSchema)
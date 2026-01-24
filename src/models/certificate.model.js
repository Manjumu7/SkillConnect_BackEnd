import mongoose from "mongoose";
const certificateSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
    }
},{timestamps: true})

export const Certificate = mongoose.model("Certificate", certificateSchema)
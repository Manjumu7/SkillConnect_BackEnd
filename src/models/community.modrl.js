 import mongoose from "mongoose";

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
        type: mongoose.Schema.Types.ObjectId, //_id is called ObjectID in mongo
        ref: "User",
        // required: true,
        index: true
    },

    mentor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mentor",
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
    }
}, { timestamps: true })

export const Community = mongoose.model("Community", communitySchema)
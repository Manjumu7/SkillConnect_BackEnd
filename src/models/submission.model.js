import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },

    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    files: [
        {
            url: { type: String, required: true },
            type: { type: String, enum: ["image", "video", "document"], required: true }
        }
    ],

    notes: {
        type: String,
        maxlength: 2000
    },

    grade: {
        type: Number,
        min: 0,
        max: 100
    },

    feedback: {
        type: String,
        maxlength: 2000
    },

    status: {
        type: String,
        enum: ["submitted", "reviewed"],
        default: "submitted",
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },

    title: {
        type: String,
        required: true
    },

    githubLink: {
        type: String,
    },

    liveDemoLink: {
        type: String
    },

    description: {
        type: String
    }

}, { timestamps: true });

submissionSchema.index({ projectId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model("Submission", submissionSchema);
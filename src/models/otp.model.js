import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },

    // Registration type: "student" (default), "mentor", or "company"
    registrationType: { type: String, default: "student" },

    // Mentor application fields (stored temporarily during OTP flow)
    expertise: [{ type: String }],
    experience_years: { type: Number },
    resume: { type: String },

    // Company application fields (stored temporarily during OTP flow)
    company_name: { type: String },
    company_website: { type: String },
    company_industry: { type: String },
    company_description: { type: String },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OTP = mongoose.model("OTP", otpSchema);
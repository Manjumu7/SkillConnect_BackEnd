import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import {
    canRequestOtp,
    generateAndStore,
    verifyAndConsume,
} from "../Services/otp.service.js";
import { sendOtpEmail } from "../Services/email.service.js";

// ── JWT helper ──────────────────────────────────────────────────
export const generateAccessToken = (user) => {
    return jwt.sign(
        { _id: user._id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

// ── POST /auth/register ─────────────────────────────────────────
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Duplicate check against verified users
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "User already registered" });
        }

        // Rate limit check
        const { allowed, retryAfterSeconds } = canRequestOtp(normalizedEmail);
        if (!allowed) {
            return res.status(429).json({
                message: `Please wait ${retryAfterSeconds}s before requesting another OTP`,
                retryAfterSeconds,
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP, hash it, and store in MongoDB
        const plainOtp = await generateAndStore(normalizedEmail, {
            name: name.trim(),
            hashedPassword,
            phone: phone ? phone.trim() : "",
        });

        // Send OTP email
        try {
            await sendOtpEmail(normalizedEmail, plainOtp);
        } catch (emailError) {
            // Clean up OTP record if email fails
            const { OTP } = await import("../models/otp.model.js");
            await OTP.deleteMany({ email: normalizedEmail });
            console.error("Email send failed:", emailError.message);
            return res.status(502).json({ message: "Failed to send OTP email. Please try again." });
        }

        return res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
        console.error("REGISTER ERROR:", error.message);
        return res.status(500).json({ message: "Registration failed. Please try again." });
    }
};

// ── POST /auth/verify-otp ───────────────────────────────────────
const verifyOTP = async (req, res) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        email = email.trim().toLowerCase();
        otp = otp.trim();

        const result = await verifyAndConsume(email, otp);

        if (!result.success) {
            return res.status(result.statusCode).json({ message: result.error });
        }

        // OTP valid → create user
        const otpRecord = result.otpRecord;
        const newUser = await User.create({
            name: otpRecord.name,
            email: otpRecord.email,
            password: otpRecord.password,
            phone: otpRecord.phone,
            role: "student",
        });

        return res.status(201).json({
            message: "Account verified and created successfully",
            userId: newUser._id,
        });
    } catch (error) {
        console.error("OTP verification failed:", error.message);
        return res.status(500).json({ message: "Verification failed. Please try again." });
    }
};

// ── POST /auth/resend-otp ───────────────────────────────────────
const resendOTP = async (req, res) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        email = email.trim().toLowerCase();

        // Rate limit check
        const { allowed, retryAfterSeconds } = canRequestOtp(email);
        if (!allowed) {
            return res.status(429).json({
                message: `Please wait ${retryAfterSeconds}s before requesting another OTP`,
                retryAfterSeconds,
            });
        }

        // Check that there IS a pending OTP record (user started registration)
        const { OTP } = await import("../models/otp.model.js");
        const existing = await OTP.findOne({ email });
        if (!existing) {
            return res.status(400).json({
                message: "No pending registration found. Please register first.",
            });
        }

        // Re-generate new OTP, keep original user data
        const plainOtp = await generateAndStore(email, {
            name: existing.name,
            hashedPassword: existing.password,
            phone: existing.phone || "",
        });

        // Send email
        try {
            await sendOtpEmail(email, plainOtp);
        } catch (emailError) {
            console.error("Resend email failed:", emailError.message);
            return res.status(502).json({ message: "Failed to send OTP email. Please try again." });
        }

        return res.status(200).json({ message: "OTP resent to your email" });
    } catch (error) {
        console.error("RESEND ERROR:", error.message);
        return res.status(500).json({ message: "Failed to resend OTP. Please try again." });
    }
};

// ── POST /auth/login ────────────────────────────────────────────
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const matchedPassword = await bcrypt.compare(password, existingUser.password);
        if (!matchedPassword) {
            return res.status(400).json({ message: "Email or password is incorrect" });
        }

        const accessToken = generateAccessToken(existingUser);
        return res.status(200).json({ message: "Login success", accessToken, user: existingUser });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: "Login failed" });
    }
};

// ── POST /auth/logout ───────────────────────────────────────────
const logoutUser = async (req, res) => {
    try {
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({ message: "Logout failed" });
    }
};

// ── POST /auth/mentor-register ──────────────────────────────────
export const applyForMentor = async (req, res) => {
    try {
        const userId = req.user._id;
        const { expertise, experience_years, resume } = req.body;

        if (!resume || !expertise || !expertise.length) {
            return res.status(400).json({
                success: false,
                message: "Resume and expertise are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.mentorStatus === "approved") {
            return res.status(400).json({ success: false, message: "You are already an approved mentor" });
        }

        if (user.mentorStatus === "pending") {
            return res.status(400).json({ success: false, message: "Your application is already under review" });
        }

        user.expertise = expertise;
        user.experience_years = experience_years;
        user.resume = resume;
        user.mentorStatus = "pending";
        user.mentorRejectionReason = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Mentor application submitted successfully",
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Application failed" });
    }
};

export { registerUser, loginUser, logoutUser, verifyOTP, resendOTP };
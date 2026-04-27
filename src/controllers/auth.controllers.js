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
        const {
            name, email, password, phone,
            // Optional: registration type and role-specific fields
            registrationType,
            // Mentor fields
            expertise, experience_years, resume,
            // Company fields
            company_name, company_website, company_industry, company_description
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        // if (password.length < 8) {
        //     return res.status(400).json({ message: "Password must be at least 8 characters long" });
        // }

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

        // Build userData with optional role-specific fields
        const userData = {
            name: name.trim(),
            hashedPassword,
            phone: phone ? String(phone).trim() : "",
            registrationType: registrationType || "student",
        };

        // Attach mentor fields if registering as mentor
        if (registrationType === "mentor") {
            userData.expertise = expertise || [];
            userData.experience_years = experience_years;
            userData.resume = resume;
        }

        // Attach company fields if registering as company
        if (registrationType === "company") {
            userData.company_name = company_name;
            userData.company_website = company_website;
            userData.company_industry = company_industry;
            userData.company_description = company_description;
        }

        // Generate OTP, hash it, and store in MongoDB
        const plainOtp = await generateAndStore(normalizedEmail, userData);
        console.log("OTP sent to your email", plainOtp);
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
        const regType = otpRecord.registrationType || "student";

        // Base user data
        const newUserData = {
            name: otpRecord.name,
            email: otpRecord.email,
            password: otpRecord.password,
            phone: otpRecord.phone,
            role: "student",  // Always start as student; admin upgrades later
        };

        // If registering as mentor → set pending status + mentor fields
        if (regType === "mentor") {
            newUserData.mentorStatus = "pending";
            newUserData.expertise = otpRecord.expertise || [];
            newUserData.experience_years = otpRecord.experience_years;
            newUserData.resume = otpRecord.resume;
        }

        // If registering as company → set pending status + company fields
        if (regType === "company") {
            newUserData.companyStatus = "pending";
            newUserData.company_name = otpRecord.company_name;
            newUserData.company_website = otpRecord.company_website;
            newUserData.company_industry = otpRecord.company_industry;
            newUserData.company_description = otpRecord.company_description;
        }

        const newUser = await User.create(newUserData);

        const successMsg = regType === "student"
            ? "Account verified and created successfully"
            : `Account created! Your ${regType} application is pending admin approval.`;

        return res.status(201).json({
            message: successMsg,
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

        // Re-generate new OTP, keep original user data (including role-specific fields)
        const plainOtp = await generateAndStore(email, {
            name: existing.name,
            hashedPassword: existing.password,
            phone: existing.phone || "",
            registrationType: existing.registrationType || "student",
            // Mentor fields
            expertise: existing.expertise || [],
            experience_years: existing.experience_years,
            resume: existing.resume,
            // Company fields
            company_name: existing.company_name,
            company_website: existing.company_website,
            company_industry: existing.company_industry,
            company_description: existing.company_description,
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

// ── POST /auth/company-register ─────────────────────────────────
export const applyForCompany = async (req, res) => {
    try {
        const userId = req.user._id;
        const { company_name, company_website, company_industry, company_description } = req.body;

        if (!company_name || !company_industry || !company_description) {
            return res.status(400).json({
                success: false,
                message: "Company name, industry, and description are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.companyStatus === "approved") {
            return res.status(400).json({ success: false, message: "You are already an approved company" });
        }

        if (user.companyStatus === "pending") {
            return res.status(400).json({ success: false, message: "Your company application is already under review" });
        }

        user.company_name = company_name;
        user.company_website = company_website || "";
        user.company_industry = company_industry;
        user.company_description = company_description;
        user.companyStatus = "pending";
        user.companyRejectionReason = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Company application submitted successfully",
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Application failed" });
    }
};

export { registerUser, loginUser, logoutUser, verifyOTP, resendOTP };
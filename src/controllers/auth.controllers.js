import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"
import bcrypt from "bcryptjs"

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All required fields missing"
            });
        }

        const oldUser = await User.findOne({ email });
        if (oldUser) {
            return res.status(409).json({
                message: "User already registered"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashPassword,
            phone,
            role: "student"
        });

        return res.status(201).json({
            message: "User created successfully",
            user
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "Failed to create user"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "All fields are required" })

        const existingUser = await User.findOne({ email })
        if (!existingUser) return res.status(404).json({ message: "Not found" })

        const matchedPassword = await bcrypt.compare(password, existingUser.password)
        if (!matchedPassword) return res.status(400).json({ message: "email or paasword is inccorect" })

        const accessToken = generateAccessToken(existingUser)

        return res.status(200).json({ message: "login success", accessToken, user: existingUser })

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "login Failed" })
    }
}

const logoutUser = async (req, res) => {
    try {
        return res.status(200).json({ message: "logout successful" });
    } catch (error) {
        return res.status(500).json({ message: "logout failed" });
    }
};

export const applyForMentor = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            expertise,
            experience_years,
            resume
        } = req.body;

        if (!resume || !expertise || !expertise.length) {
            return res.status(400).json({
                success: false,
                message: "Resume and expertise are required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 🚫 Already approved
        if (user.mentorStatus === "approved") {
            return res.status(400).json({
                success: false,
                message: "You are already an approved mentor"
            });
        }

        // 🚫 Already pending
        if (user.mentorStatus === "pending") {
            return res.status(400).json({
                success: false,
                message: "Your application is already under review"
            });
        }

        // ✅ If rejected OR never applied → allow reapply
        user.expertise = expertise;
        user.experience_years = experience_years;
        user.resume = resume;
        user.mentorStatus = "pending";

        // Clear previous rejection reason
        user.mentorRejectionReason = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Mentor application submitted successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Application failed"
        });
    }
};

export {
    registerUser,
    loginUser,
    logoutUser
}
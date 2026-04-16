import bcrypt from "bcryptjs";
import { OTP } from "../models/otp.model.js";

// ── In-memory rate limiter (per email) ──────────────────────────
// Tracks { count, windowStart } – max 3 OTP requests per 15 min
const otpRequestLog = new Map();
const MAX_REQUESTS = 3;
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
const COOLDOWN_MS = 60 * 1000;      // 60 seconds between requests

// ── Max verification attempts before lockout ────────────────────
const MAX_ATTEMPTS = 5;

/**
 * Check whether the email is allowed to request a new OTP.
 * Returns { allowed, retryAfterSeconds }
 */
export function canRequestOtp(email) {
    const now = Date.now();
    const entry = otpRequestLog.get(email);

    if (!entry) return { allowed: true, retryAfterSeconds: 0 };

    // Reset window if expired
    if (now - entry.windowStart > WINDOW_MS) {
        otpRequestLog.delete(email);
        return { allowed: true, retryAfterSeconds: 0 };
    }

    // Cooldown between consecutive requests
    const sinceLast = now - entry.lastRequest;
    if (sinceLast < COOLDOWN_MS) {
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil((COOLDOWN_MS - sinceLast) / 1000),
        };
    }

    // Max requests in window
    if (entry.count >= MAX_REQUESTS) {
        const windowRemaining = WINDOW_MS - (now - entry.windowStart);
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil(windowRemaining / 1000),
        };
    }

    return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Generate a 6-digit OTP, hash it, store in MongoDB with user data.
 * Invalidates any previous OTP for the same email.
 */
export async function generateAndStore(email, userData) {
    const now = Date.now();

    // ── Record this request in the rate limiter ────────
    const entry = otpRequestLog.get(email);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
        otpRequestLog.set(email, { count: 1, windowStart: now, lastRequest: now });
    } else {
        entry.count += 1;
        entry.lastRequest = now;
    }

    // ── Generate & hash OTP ────────────────────────────
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);

    // ── Invalidate previous OTPs for this email ────────
    await OTP.deleteMany({ email });

    // ── Persist ────────────────────────────────────────
    await OTP.create({
        email,
        otp: hashedOtp,
        name: userData.name,
        password: userData.hashedPassword,   // already hashed by caller
        phone: userData.phone || "",
        attempts: 0,
        expiresAt: new Date(now + 5 * 60 * 1000), // 5 minutes

        // Role-specific fields (will be "student" if not provided)
        registrationType: userData.registrationType || "student",

        // Mentor fields
        expertise: userData.expertise || [],
        experience_years: userData.experience_years || undefined,
        resume: userData.resume || undefined,

        // Company fields
        company_name: userData.company_name || undefined,
        company_website: userData.company_website || undefined,
        company_industry: userData.company_industry || undefined,
        company_description: userData.company_description || undefined,
    });

    return plainOtp;   // plain OTP goes into the email only
}

/**
 * Verify an OTP for a given email.
 * Returns { success, error, statusCode, otpRecord? }
 */
export async function verifyAndConsume(email, plainOtp) {
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
        return { success: false, error: "No OTP found. Please register first.", statusCode: 400 };
    }

    // ── Explicit expiry check (belt-and-suspenders with TTL index) ──
    if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteMany({ email });
        return { success: false, error: "OTP has expired. Please request a new one.", statusCode: 400 };
    }

    // ── Brute-force guard ──────────────────────────────
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
        await OTP.deleteMany({ email });
        return {
            success: false,
            error: "Too many failed attempts. Please request a new OTP.",
            statusCode: 429,
        };
    }

    // ── Compare hashed OTP ─────────────────────────────
    const isMatch = await bcrypt.compare(plainOtp, otpRecord.otp);

    if (!isMatch) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        const remaining = MAX_ATTEMPTS - otpRecord.attempts;
        return {
            success: false,
            error: remaining > 0
                ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
                : "Too many failed attempts. Please request a new OTP.",
            statusCode: 400,
        };
    }

    // ── Success – delete OTP record ────────────────────
    await OTP.deleteMany({ email });
    return { success: true, otpRecord };
}

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ── Gmail SMTP transporter (uses App Password from .env) ────────
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const getOtpTemplate = (otp) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        <div style="background-color: #2563eb; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SkillConnect</h1>
          <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Elevate Your Learning Journey</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #111827; margin: 0 0 16px 0;">Verify your account</h2>
          <p style="font-size: 16px; color: #4b5563; line-height: 24px; margin-bottom: 30px;">
            Welcome to SkillConnect! Use the OTP below to verify your email address.
          </p>
          <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; text-align: center; border: 1px dashed #d1d5db;">
            <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Your Verification Code</span>
            <h2 style="color: #2563eb; font-size: 36px; letter-spacing: 10px; margin: 0; font-weight: 800; font-family: monospace;">${otp}</h2>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 25px 0; text-align: center;">
            This code is valid for <b>5 minutes</b>.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 13px;">
            If you didn't create a SkillConnect account, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} SkillConnect LMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send OTP email via Gmail SMTP with 1 automatic retry on failure.
 */
const sendOtpEmail = async (to, otp, _retryCount = 0) => {
    const MAX_RETRIES = 1;
    const RETRY_DELAY_MS = 2000;

    try {
        console.log(`📧 Sending OTP to ${to} via Gmail SMTP`);

        await transporter.sendMail({
            from: `"SkillConnect" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Your SkillConnect Verification Code",
            html: getOtpTemplate(otp),
        });

        console.log("✅ OTP email sent successfully");
        return { success: true };

    } catch (error) {
        console.error(`❌ Email send attempt ${_retryCount + 1} failed:`, error.message);

        if (_retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            return sendOtpEmail(to, otp, _retryCount + 1);
        }

        throw new Error(`Email sending failed after ${MAX_RETRIES + 1} attempts: ${error.message}`);
    }
};

export { sendOtpEmail };
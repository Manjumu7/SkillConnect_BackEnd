import dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

const require = createRequire(import.meta.url);
const { BrevoClient } = require("@getbrevo/brevo");

// ── Validate required env var ───────────────────────────────────
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  console.error("⚠️ Missing BREVO_API_KEY environment variable. Email service will not work.");
}

// ── Brevo API client setup ──────────────────────────────────────
const brevo = new BrevoClient({ apiKey: BREVO_API_KEY });

// ── OTP email template ──────────────────────────────────────────
const getOtpTemplate = (otp) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
      <h1 style="color: #333;">SkillConnect</h1>
      <p style="font-size: 16px; color: #666;">Verify your email to complete your registration.</p>
      <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <h2 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h2>
      </div>
      <p style="color: #999; font-size: 14px;">This OTP is valid for 5 minutes.</p>
    </div>
  </body>
  </html>
`;

// ── Send OTP email ──────────────────────────────────────────────
const sendOtpEmail = async (to, otp) => {
  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email: to }],
      sender: { email: "skillconnect100@gmail.com", name: "SkillConnect" },
      subject: "Your SkillConnect Verification Code",
      htmlContent: getOtpTemplate(otp),
      textContent: `Your OTP is: ${otp}. Valid for 5 minutes.`,
    });

    console.log("📨 OTP email sent:", { to, messageId: response.messageId });
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// ── Transporter-compatible object for startup check ─────────────
const transporter = {
  verify: () => {
    if (!BREVO_API_KEY) {
      console.error("⚠️ Brevo not configured — missing API key");
      return Promise.resolve(false);
    }
    console.log("✅ Brevo configured and ready");
    return Promise.resolve(true);
  },
};

export { transporter, sendOtpEmail };
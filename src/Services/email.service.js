import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ── Validate required env vars ──────────────────────────────────
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error(
    "⚠️ Missing EMAIL_USER or EMAIL_PASS environment variables. Email service will not work."
  );
}

// ── SMTP Transporter (Gmail via App Password) ───────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  // Force IPv4 — prevents ENETUNREACH on Render and similar platforms
  family: 4,
  // Connection reliability timeouts
  connectionTimeout: 10_000, // 10s to establish connection
  greetingTimeout: 10_000,   // 10s for SMTP greeting
  socketTimeout: 15_000,     // 15s for socket inactivity
});

// ── Verify SMTP connection on startup ───────────────────────────
transporter
  .verify()
  .then(() => console.log("✅ SMTP Connection Verified"))
  .catch((err) => {
    console.error("❌ SMTP Connection Failed:", err.message);
    // Don't crash — email may recover, and the server can still handle
    // non-email routes. Individual send attempts will report their own errors.
  });

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
  const mailOptions = {
    from: `"SkillConnect" <${EMAIL_USER}>`,
    to,
    subject: "Your SkillConnect Verification Code",
    html: getOtpTemplate(otp),
    text: `Your OTP is: ${otp}. Valid for 5 minutes.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 OTP email sent:", { to, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

export { transporter, sendOtpEmail };
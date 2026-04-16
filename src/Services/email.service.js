import dotenv from "dotenv";

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY in .env");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

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

/**
 * Send an email via Brevo Transactional Email REST API.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */
const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  const payload = {
    sender: { email: "skillconnect100@gmail.com", name: "SkillConnect" },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  if (textContent) {
    payload.textContent = textContent;
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Brevo API error:", response.status, errorBody);
    throw new Error(`Brevo API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  console.log("Email sent successfully via Brevo. MessageId:", data.messageId);
  return data;
};

const sendOtpEmail = async (to, otp) => {
  return await sendEmail({
    to,
    subject: "Verify your Email - SkillConnect",
    htmlContent: getOtpTemplate(otp),
    textContent: `Your OTP is: ${otp}. Valid for 5 minutes.`,
  });
};

const transporter = {
  verify: () => {
    if (!BREVO_API_KEY) return Promise.resolve(false);
    return Promise.resolve(true);
  },
};

export { transporter, sendOtpEmail };
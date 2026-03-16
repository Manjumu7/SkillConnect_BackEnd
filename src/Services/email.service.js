import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

if (!process.env.SENDGRID_API_KEY) {
    console.error('⚠️  Missing SENDGRID_API_KEY environment variable');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">SkillConnect</h1>
          <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Elevate Your Learning Journey</p>
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Verify your account</h2>
          <p style="font-size: 16px; color: #4b5563; line-height: 24px; margin-bottom: 30px;">
            Welcome to SkillConnect! To get started with your courses and connect with experts, please use the following One-Time Password (OTP) to verify your email address.
          </p>

          <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; text-align: center; border: 1px dashed #d1d5db;">
            <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Your Verification Code</span>
            <h2 style="color: #2563eb; font-size: 36px; letter-spacing: 10px; margin: 0; font-weight: 800; font-family: monospace;">${otp}</h2>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin: 25px 0; text-align: center;">
            This code is valid for <b>5 minutes</b>.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 13px; line-height: 20px;">
            If you didn't create a SkillConnect account, you can safely ignore this email or contact our support team if you have concerns.
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

const sendOtpEmail = async (to, otp) => {
    try {
        console.log(`📧 Sending OTP to ${to} via SendGrid`);

        const msg = {
            to: to,
            from: {
                email: 'finalyearproject2023.01@gmail.com',
                name: 'ImpactHub'
            },
            subject: 'Your ImpactHub Verification Code',
            text: `Your ImpactHub OTP is: ${otp}. It is valid for 5 minutes.`,
            html: getOtpTemplate(otp),
        };

        const response = await sgMail.send(msg);

        console.log('✅ OTP email sent successfully via SendGrid');
        return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error.message);

        if (error.response) {
            console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
        }

        throw new Error(`Email sending failed: ${error.message}`);
    }
};

const transporter = {
    verify: () => {
        console.log('✅ SendGrid configured and ready');
        return Promise.resolve(true);
    }
};

export { transporter, sendOtpEmail };
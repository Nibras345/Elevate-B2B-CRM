import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Configure Nodemailer transporter directly using process.env credentials
 */
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Sends a modern, secure OTP verification email to the user
 * @param to - Recipient email address
 * @param otp - 6-digit one-time password
 * @param recipientName - Optional recipient full name for personalization
 */
export const sendOtpEmail = async (
  to: string,
  otp: string,
  recipientName?: string
): Promise<void> => {
  const senderEmail = process.env.SMTP_EMAIL;
  const name = recipientName || 'Valued User';

  const mailOptions = {
    from: `"NexSphere CRM Security" <${senderEmail}>`,
    to,
    subject: `Your Password Reset OTP: ${otp} - NexSphere CRM`,
    text: `Hello ${name},\n\nYou requested a password reset for your NexSphere CRM account.\nYour 6-digit verification code is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request this, please ignore this email.\n\nRegards,\nNexSphere Security Team`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .container {
          max-width: 540px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
          padding: 32px 28px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #c7d2fe;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .content {
          padding: 36px 32px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .message {
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 24px;
        }
        .otp-container {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 24px 20px;
          text-align: center;
          margin: 28px 0;
        }
        .otp-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .otp-code {
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 38px;
          font-weight: 800;
          color: #4338ca;
          letter-spacing: 8px;
          margin: 6px 0;
        }
        .otp-expiry {
          font-size: 12px;
          color: #ef4444;
          font-weight: 500;
          margin-top: 6px;
        }
        .alert-box {
          background-color: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 13px;
          color: #92400e;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .footer {
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
          padding: 20px 32px;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NexSphere CRM</h1>
          <p>Security & Account Protection</p>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${name}</div>
          <div class="message">
            We received a request to reset the password associated with your NexSphere CRM account. Please use the verification code below to complete the reset process:
          </div>
          
          <div class="otp-container">
            <div class="otp-label">Verification Code (OTP)</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Expires in 10 minutes</div>
          </div>

          <div class="alert-box">
            <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or contact your company CRM administrator immediately. Your password will remain unchanged.
          </div>
          
          <div class="message" style="margin-bottom: 0;">
            Never share this OTP code with anyone. NexSphere staff will never ask for your verification code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} NexSphere CRM Enterprise Inc. All rights reserved.<br>
          This is an automated security notification. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

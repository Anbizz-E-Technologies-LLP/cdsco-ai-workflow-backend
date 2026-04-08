const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
 
const sendWelcomeEmail = async ({ name, email, role, verificationToken, tempPassword }) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const roleLabels = {
    admin: "Administrator",
    reviewer: "Reviewer",
    analyst: "Analyst",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 32px; text-align: center; }
        .header h1 { color: #e2b714; margin: 0; font-size: 26px; letter-spacing: 1px; }
        .header p { color: #a0aec0; margin: 8px 0 0; font-size: 14px; }
        .body { padding: 40px 32px; }
        .greeting { font-size: 18px; color: #1a1a2e; font-weight: 600; margin-bottom: 12px; }
        .text { color: #4a5568; line-height: 1.7; margin-bottom: 20px; }
        .role-badge { display: inline-block; background: #e2b714; color: #1a1a2e; font-weight: 700; padding: 4px 14px; border-radius: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .credentials-box { background: #f7f9fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
        .credentials-box h3 { margin: 0 0 12px; color: #2d3748; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cred-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
        .cred-row:last-child { border-bottom: none; }
        .cred-label { color: #718096; }
        .cred-value { color: #2d3748; font-weight: 600; font-family: monospace; }
        .btn { display: block; width: fit-content; margin: 28px auto; background: #e2b714; color: #1a1a2e; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
        .warning { background: #fff5f5; border-left: 4px solid #fc8181; padding: 12px 16px; border-radius: 4px; color: #c53030; font-size: 13px; margin-top: 24px; }
        .footer { background: #f7f9fc; padding: 20px 32px; text-align: center; color: #a0aec0; font-size: 12px; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ ${process.env.APP_NAME || "Admin Panel"}</h1>
          <p>Account Created Successfully</p>
        </div>
        <div class="body">
          <p class="greeting">Hello, ${name}!</p>
          <p class="text">
            Your account has been created with the role: <span class="role-badge">${roleLabels[role] || role}</span>
          </p>
          <div class="credentials-box">
            <h3>Your Login Credentials</h3>
            <div class="cred-row">
              <span class="cred-label">Email</span>
              <span class="cred-value">${email}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Temporary Password</span>
              <span class="cred-value">${tempPassword}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Role</span>
              <span class="cred-value">${roleLabels[role] || role}</span>
            </div>
          </div>
          <p class="text">
            Please verify your email address and log in to set a new password.
            This verification link expires in <strong>24 hours</strong>.
          </p>
          <a href="${verifyUrl}" class="btn">Verify Email & Activate Account</a>
          <div class="warning">
            ⚠️ Please change your password immediately after your first login. Do not share your credentials with anyone.
          </div>
        </div>
        <div class="footer">
          <p>If you didn't expect this email, please contact your administrator.</p>
          <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || "Admin Panel"}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: email, subject: `Your ${process.env.APP_NAME || "Admin Panel"} Account Has Been Created`, html });
};

 

module.exports = { sendWelcomeEmail };
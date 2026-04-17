const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcomeEmail = async ({ name, email, role, tempPassword }) => {
  const roleLabels = { admin: "Administrator", reviewer: "Reviewer", analyst: "Analyst" };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dce3f0;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:36px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                ✦ Sugam AI Platform
              </p>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">Your account is ready to use</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#1e3a8a;">Hello, ${name}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.7;">
                Welcome to <strong>Sugam AI Platform</strong>. Your account has been created by an administrator.
                Use the credentials below to log in and get started.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#f8faff;border:1px solid #dce3f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="padding:10px 16px;border-bottom:1px solid #dce3f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">
                      Login Credentials
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;color:#6b7280;width:120px;">Email</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;font-weight:600;
                      color:#1e3a8a;font-family:'Courier New',monospace;text-align:right;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;color:#6b7280;width:120px;">Password</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:15px;font-weight:700;
                      color:#1e3a8a;font-family:'Courier New',monospace;letter-spacing:2px;text-align:right;">${tempPassword}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#6b7280;width:120px;">Role</td>
                  <td style="padding:14px 16px;text-align:right;">
                    <span style="background:#3b82f6;color:#ffffff;font-size:12px;font-weight:700;
                        padding:4px 14px;border-radius:20px;">${roleLabels[role] || role}</span>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-left:3px solid #f87171;background:#fff5f5;padding:12px 16px;border-radius:0 6px 6px 0;">
                    <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.6;">
                      Please change your password immediately after your first login. Do not share your credentials with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;background:#f8faff;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                If you didn't expect this email, please contact your administrator.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Sugam AI Platform · <a href="mailto:noreply@anbizz.com" style="color:#3b82f6;text-decoration:none;">noreply@anbizz.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Sugam AI Platform" <noreply@anbizz.com>`,
    to:      email,
    subject: `Welcome to Sugam AI Platform — Your account is ready`,
    html,
  });
};

module.exports = { sendWelcomeEmail };
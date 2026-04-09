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
<head>
  <meta charset="UTF-8"/>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:36px 32px;text-align:center;">
              <p style="margin:0;color:#e2b714;font-size:20px;font-weight:700;letter-spacing:0.5px;">
                &#9672; ${process.env.APP_NAME || "Admin Panel"}
              </p>
              <p style="margin:8px 0 0;color:#a0aec0;font-size:13px;">Your account is ready</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">

              <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#1a1a2e;">Hello, ${name}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.7;">Your account has been created. Use the credentials below to log in.</p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f9fc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:0.6px;">Login credentials</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;color:#718096;width:120px;">Email</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;font-weight:600;color:#2d3748;font-family:'Courier New',monospace;text-align:right;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:13px;color:#718096;width:120px;">Password</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:15px;font-weight:700;color:#2d3748;font-family:'Courier New',monospace;letter-spacing:2px;text-align:right;">${tempPassword}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#718096;width:120px;">Role</td>
                  <td style="padding:14px 16px;text-align:right;">
                    <span style="background:#e2b714;color:#1a1a2e;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">${roleLabels[role] || role}</span>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-left:3px solid #fc8181;background:#fff5f5;padding:12px 16px;border-radius:0 6px 6px 0;">
                    <p style="margin:0;font-size:13px;color:#c53030;line-height:1.6;">Please change your password after your first login. Do not share your credentials with anyone.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;background:#f7f9fc;">
              <p style="margin:0 0 4px;font-size:12px;color:#a0aec0;">If you didn't expect this email, contact your administrator.</p>
              <p style="margin:0;font-size:12px;color:#a0aec0;">© ${new Date().getFullYear()} ${process.env.APP_NAME || "Admin Panel"}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"${process.env.APP_NAME || "Admin Panel"}" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Welcome to ${process.env.APP_NAME || "Admin Panel"} — Your account is ready`,
    html,
  });
};

module.exports = { sendWelcomeEmail };
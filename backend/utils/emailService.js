const nodemailer = require('nodemailer');
const { generatePayslipPDFBuffer } = require('./pdfBuffer');

/**
 * Build a valid SMTP `from` address.
 * EMAIL_FROM should be just the email (e.g. user@gmail.com).
 * displayName is the sender label shown in email clients.
 */
function buildFromAddress(displayName) {
  const fromEmail = (process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim();
  return `"${displayName}" <${fromEmail}>`;
}

/**
 * Create a Gmail SMTP transporter.
 * Requires EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env.
 * Falls back to Ethereal test account ONLY if credentials are missing.
 */
async function createSMTPTransporter() {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').trim();

  if (emailUser && emailPass) {
    // Use Gmail SMTP with TLS. rejectUnauthorized:false handles corporate/Windows
    // SSL certificate chain issues without compromising actual auth security.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false, // Fix: avoid self-signed cert errors on Windows/corporate networks
      },
    });

    try {
      await transporter.verify();
      console.log('✅ Gmail SMTP verified — real emails will be sent');
    } catch (verifyErr) {
      // Log the warning but still return the transporter — sendMail may still work
      // even if verify() fails (verify checks the connection, sendMail does the actual auth)
      console.warn('⚠️ Gmail SMTP verify() warning (will still attempt send):', verifyErr.message);
    }

    return transporter;
  }

  console.warn('⚠️ EMAIL_USER / EMAIL_PASS not configured. Using Ethereal test account for development email delivery.');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Send verification email on registration
// ─────────────────────────────────────────────────────────────
async function sendVerificationEmail(user, token, origin) {

  const finalAppUrl = (origin || '').replace(/\/$/, '') || 'https://payslip-gen-rouge.vercel.app';
  const verifyUrl = `${finalAppUrl}/verify?token=${token}`;

  console.log(`✉️ Sending verification email to: ${user.email}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress('PaySlip Pro'),
    to: user.email,
    subject: `Verify Your PaySlip Pro Account`,
    html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr><td height="6" bgcolor="#FFBE11" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#57833B" style="padding: 40px 45px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">PaySlip Pro</h1>
              <p style="margin: 8px 0 0 0; color: #d0e8c0; font-size: 14px;">Professional Payroll Management</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #374151;">Hi ${user.companyName || 'there'},</p>
              <p style="margin: 0 0 30px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Thank you for registering with PaySlip Pro. Click the button below to verify your account.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display: inline-block; background: #57833B; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      Verify My Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #9ca3af;">
                Or copy this link: <a href="${verifyUrl}" style="color: #57833B;">${verifyUrl}</a><br/>
                This link expires in 24 hours.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 20px 45px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; 2026 PaySlip Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to: ${user.email}`);
  } catch (err) {
    console.error(`❌ Verification email SMTP error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Send payslip as PDF attachment to the employee's email
// ─────────────────────────────────────────────────────────────
async function sendPayslipEmail(payslip) {
  // Use a development test account if SMTP credentials are not configured.
  // In production, missing credentials should still be addressed by setting EMAIL_USER and EMAIL_PASS.

  // Generate PDF attachment
  console.log('📄 Generating PDF buffer for email...');
  const pdfBuffer = await generatePayslipPDFBuffer(payslip);

  if (!pdfBuffer || pdfBuffer.length < 100) {
    throw new Error('PDF generation produced an empty or invalid file. Cannot send email.');
  }
  console.log(`✅ PDF Buffer ready: ${pdfBuffer.length} bytes`);

  const transporter = await createSMTPTransporter();


  const fileName = `Payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf`;

  const mailOptions = {
    from: buildFromAddress(payslip.companyName),
    to: payslip.employeeEmail,
    subject: `Salary Slip for ${payslip.month} ${payslip.year} — ${payslip.companyName}`,
    html: buildEmailHTML(payslip),
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  console.log(`🚀 Sending email to: ${payslip.employeeEmail}`);
  const result = await transporter.sendMail(mailOptions);
  console.log(`✅ Email delivered. Message ID: ${result.messageId}`);
  return result;
}

// ─────────────────────────────────────────────────────────────
// Build clean HTML email body for payslip notification
// ─────────────────────────────────────────────────────────────
function buildEmailHTML(payslip) {
  const formatINR = (n) =>
    '₹ ' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const green = '#57833B';  // BDA Olive Green
  const gold = '#FFBE11';   // BDA Accent Gold

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payslip - ${payslip.employeeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          <tr><td height="6" bgcolor="${gold}" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>

          <!-- Header -->
          <tr>
            <td bgcolor="${green}" style="padding: 40px 45px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${payslip.companyName.toUpperCase()}</h1>
              <p style="margin: 6px 0 0 0; color: #d0e8c0; font-size: 14px; font-weight: 500;">Salary Slip for ${payslip.month} ${payslip.year}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 17px; font-weight: 700;">Dear ${payslip.employeeName},</p>
              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Your payslip for <strong>${payslip.month} ${payslip.year}</strong> is attached to this email. Please find the detailed salary breakdown below.
              </p>

              <!-- Salary Summary Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 10px; border-left: 5px solid ${green};">
                <tr>
                  <td style="padding: 20px 25px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #6b7280; padding-bottom: 10px;">Employee ID</td>
                        <td align="right" style="font-size: 13px; color: #374151; font-weight: 700; padding-bottom: 10px;">${payslip.employeeId}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6b7280; padding-bottom: 10px;">Designation</td>
                        <td align="right" style="font-size: 13px; color: #374151; font-weight: 700; padding-bottom: 10px;">${payslip.designation}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; padding-bottom: 10px;">Gross Earnings</td>
                        <td align="right" style="font-size: 13px; color: #059669; font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 12px; padding-bottom: 10px;">${formatINR(payslip.grossEarnings)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">Total Deductions</td>
                        <td align="right" style="font-size: 13px; color: #dc2626; font-weight: 700; padding-bottom: 8px;">${formatINR(payslip.totalDeductions)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Net Salary -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: ${green}; border-radius: 10px; text-align: center;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0; color: #d0e8c0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Net Salary Payable</p>
                    <h2 style="margin: 8px 0 0 0; color: ${gold}; font-size: 30px; font-weight: 800;">${formatINR(payslip.netSalary)}</h2>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <strong>Note:</strong> Please refer to the attached PDF for the full statutory breakdown.<br/>
                For queries, contact <a href="mailto:${payslip.companyEmail || ''}" style="color: ${green}; text-decoration: none; font-weight: 600;">${payslip.companyEmail || 'HR Department'}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f9fafb" style="padding: 20px 45px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; 2026 PaySlip Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────
// Send password-reset email with a secure link
// ─────────────────────────────────────────────────────────────
async function sendPasswordResetEmail(user, token, origin, customLink) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials missing — using Ethereal test SMTP for password reset email.');
  }

  const finalAppUrl = (origin || '').replace(/\/$/, '') ||
    process.env.FRONTEND_URL ||
    'https://payslip-gen-rouge.vercel.app';
  
  const resetUrl = customLink || `${finalAppUrl}/reset-password?token=${token}`;

  console.log(`✉️ Sending password reset email to: ${user.email}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress('PaySlip Pro'),
    to: user.email,
    subject: `Reset Your PaySlip Pro Password`,
    html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr><td height="6" bgcolor="#FFBE11" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#1e3a5f" style="padding: 40px 45px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">PaySlip Pro</h1>
              <p style="margin: 8px 0 0 0; color: #a8c0d6; font-size: 14px;">Professional Payroll Management</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #374151;">Hi ${user.companyName || 'there'},</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                We received a request to reset the password for your PaySlip Pro account linked to <strong>${user.email}</strong>.
              </p>
              <p style="margin: 0 0 30px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: #1e3a5f; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #9ca3af;">
                Or copy this link: <a href="${resetUrl}" style="color: #1e3a5f;">${resetUrl}</a><br/>
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 20px 45px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; 2026 PaySlip Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📭 Password reset email preview available at: ${previewUrl}`);
      return previewUrl;
    }
    console.log(`✅ Password reset email sent to: ${user.email}`);
    return null;
  } catch (err) {
    console.error(`❌ Password reset email SMTP error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Send staff portal provisioning email with a password setup link
// ─────────────────────────────────────────────────────────────
async function sendStaffProvisionEmail(staff, tempPassword, setupUrl) {
  console.log(`✉️ Sending staff provision email to: ${staff.email}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress('PaySlip Pro'),
    to: staff.email,
    subject: `Welcome to the Staff Portal — ${staff.user?.companyName || 'Your Company'}`,
    html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr><td height="6" bgcolor="#FFBE11" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#1e3a5f" style="padding: 40px 45px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Staff Portal Access</h1>
              <p style="margin: 8px 0 0 0; color: #a8c0d6; font-size: 14px;">${staff.user?.companyName || ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #374151;">Hi ${staff.fullName},</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                An administrator has granted you access to the Staff Portal.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Click the button below to set your password and complete your profile.
              </p>
              ${tempPassword ? `
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Your temporary password: <strong style="font-family: monospace;">${tempPassword}</strong>
              </p>
              <p style="margin: 0 0 18px 0; font-size: 13px; color: #9ca3af;">Use this to login once, then set a new password.</p>
              ` : ''}
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" style="display: inline-block; background: #1e3a5f; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #9ca3af;">
                Or copy this link: <a href="${setupUrl}" style="color: #1e3a5f;">${setupUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 20px 45px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; 2026 PaySlip Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📭 Staff provision email preview available at: ${previewUrl}`);
      return previewUrl;
    }
    console.log(`✅ Staff provision email sent to: ${staff.email}`);
    return null;
  } catch (err) {
    console.error(`❌ Staff provision email SMTP error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Send punch-out reminder / overstay email
// ─────────────────────────────────────────────────────────────
async function sendPunchOutReminderEmail(staff, loginUrl, details = {}) {
  console.log(`✉️ Sending punch-out reminder email to: ${staff.email}`);

  const transporter = await createSMTPTransporter();
  const {
    loginTime = 'N/A',
    shiftDate = 'N/A',
    duration = 'N/A',
    workStatus = 'In Progress',
    reason = 'Your shift has crossed the expected working window.',
    autoClosed = false
  } = details;

  const mailOptions = {
    from: buildFromAddress('PaySlip Pro'),
    to: staff.email,
    subject: autoClosed ? `⚠️ Shift Auto-Closed: Please Review Attendance` : `⏰ Reminder: Please Punch Out for the Day`,
    html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr><td height="6" bgcolor="#e11d48" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#1e3a5f" style="padding: 40px 45px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${autoClosed ? 'Attendance Updated' : 'Action Required'}</h1>
              <p style="margin: 8px 0 0 0; color: #a8c0d6; font-size: 14px;">Shift Duration Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #374151;">Hi ${staff.fullName},</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                ${reason}
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
                <tr><td style="padding: 14px 16px; font-size: 13px; color: #111827;"><strong>Shift Date:</strong> ${shiftDate}</td></tr>
                <tr><td style="padding: 0 16px 14px; font-size: 13px; color: #111827;"><strong>Login Time:</strong> ${loginTime}</td></tr>
                <tr><td style="padding: 0 16px 14px; font-size: 13px; color: #111827;"><strong>Current Duration:</strong> ${duration}</td></tr>
                <tr><td style="padding: 0 16px 14px; font-size: 13px; color: #111827;"><strong>Current Status:</strong> ${workStatus}</td></tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 30px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 13px; color: #7c2d12; line-height: 1.6;">
                    <strong>Work Hours Policy</strong><br/>
                    Start Time: 10:30 AM<br/>
                    Half Day Threshold: Punch-in after 11:00 AM<br/>
                    Full Day: 8.5+ hours logged<br/>
                    Half Day: 4 to 7.9 hours logged<br/>
                    LOP: Less than 4 hours<br/>
                    Overtime: After 8.5h (Max 1h)
                  </td>
                </tr>
              </table>
              ${autoClosed ? `
              <p style="margin: 0 0 30px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your shift has been auto-closed because it exceeded the maximum allowed duration. Please review your attendance and contact HR/Admin if correction is needed.
              </p>` : `
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: #e11d48; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      Punch Out Now
                    </a>
                  </td>
                </tr>
              </table>
              `}
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 20px 45px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; 2026 PaySlip Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Punch-out reminder email sent to: ${staff.email}`);
  } catch (err) {
    console.error(`❌ Punch-out reminder email SMTP error: ${err.message}`);
    throw err;
  }
}

module.exports = { sendPayslipEmail, sendVerificationEmail, sendPasswordResetEmail, sendStaffProvisionEmail, sendPunchOutReminderEmail };

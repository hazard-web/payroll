const nodemailer = require('nodemailer');
const { generatePayslipPDFBuffer } = require('./pdfBuffer');
const { buildSetupLink, buildVerifyLink } = require('./urlHelper');

/**
 * Build a valid SMTP `from` address.
 * EMAIL_FROM should be just the email (e.g. user@gmail.com).
 * displayName is the sender label shown in email clients.
 */
function buildFromAddress(displayName) {
  const fromEmail = sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER);
  const safeDisplayName = String(displayName || 'PaySlip Pro').replace(/"/g, '').trim() || 'PaySlip Pro';
  return `"${safeDisplayName}" <${fromEmail}>`;
}

/**
 * Sanitize a value that may have been wrapped in markdown link syntax
 * (e.g. "[rkg98521@gmail.com](mailto:rkg98521@gmail.com)" → "rkg98521@gmail.com").
 * This happens when a user pastes a value from rendered markdown.
 */
function sanitizeEmailValue(value) {
  if (!value) return '';
  let v = String(value).trim();
  // Strip surrounding markdown link like [addr](mailto:addr)
  const m = v.match(/^\[(.+?)\]\(mailto:.+?\)$/i) || v.match(/^\[(.+?)\]\((.+?)\)$/);
  if (m) v = m[1];
  return v.trim();
}

/**
 * Detect if the configured credentials look like placeholders.
 */
function hasRealCredentials() {
  const user = sanitizeEmailValue(process.env.EMAIL_USER);
  const pass = (process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) return false;
  if (pass.includes('PASTE_') || pass.includes('YOUR_') || pass.includes('XXXX')) return false;
  // Gmail App Passwords are exactly 16 chars (letters + digits + spaces)
  if (pass.replace(/\s/g, '').length < 10) return false;
  return true;
}

/**
 * Create a Gmail SMTP transporter.
 * Requires EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env.
 * Falls back to Ethereal test account ONLY if credentials are missing.
 */
async function createSMTPTransporter() {
  const emailUser = sanitizeEmailValue(process.env.EMAIL_USER);
  const emailPass = (process.env.EMAIL_PASS || '').trim();

  if (hasRealCredentials()) {
    // Port 587 + STARTTLS works better on corporate/Windows networks than port 465.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS
      requireTLS: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false, // tolerate corporate SSL chains
      },
    });

    try {
      await transporter.verify();
      console.log(`✅ Gmail SMTP verified — real emails will be sent (user=${emailUser})`);
    } catch (verifyErr) {
      // Log a clear hint so devs know how to fix credentials
      console.warn('⚠️  Gmail SMTP verify() failed.');
      console.warn('   Error:', verifyErr.message);
      console.warn('   Fix:');
      console.warn('   1. Enable 2-Step Verification on your Google account');
      console.warn('   2. Generate a Gmail App Password: https://myaccount.google.com/apppasswords');
      console.warn('   3. Set EMAIL_PASS in backend/.env to that 16-character password');
      console.warn('   4. Restart the backend');
      console.warn('   Will still attempt sendMail (it sometimes succeeds where verify fails).');
    }

    return transporter;
  }

  // Helpful diagnostic when SMTP isn't configured
  const passLooksEmpty = !emailPass;
  const passIsPlaceholder = emailPass.includes('PASTE_') || emailPass.includes('YOUR_') || emailPass.includes('XXXX');
  console.warn('────────────────────────────────────────────────────');
  console.warn('⚠️  Email credentials missing or invalid.');
  if (!emailUser) console.warn('   • EMAIL_USER is empty in .env');
  if (passLooksEmpty) console.warn('   • EMAIL_PASS is empty in .env');
  if (passIsPlaceholder) console.warn('   • EMAIL_PASS is still a placeholder ("' + emailPass.substring(0, 30) + '...")');
  console.warn('   To enable real email delivery, set:');
  console.warn('   EMAIL_USER=your.address@gmail.com');
  console.warn('   EMAIL_PASS=your-16-char-gmail-app-password');
  console.warn('   (Generate at https://myaccount.google.com/apppasswords)');
  console.warn('   Falling back to Ethereal test SMTP for development...');
  console.warn('────────────────────────────────────────────────────');

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
  // Support both pre-built URLs (from buildVerifyLink) and legacy origin URLs
  // If origin looks like a full URL ending with ?token=, use it directly
  // Otherwise build from origin as before
  let verifyUrl;
  if (origin && origin.includes('?token=')) {
    // Pre-built URL from centralized helper
    verifyUrl = origin;
  } else {
    const finalAppUrl = (origin || '').replace(/\/$/, '') ||
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'https://rohit98k-payroll-portal.vercel.app';
    verifyUrl = `${finalAppUrl}/verify?token=${token}`;
  }

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
            <td bgcolor="#58833b" style="padding: 40px 45px; text-align: center;">
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
                    <a href="${verifyUrl}" style="display: inline-block; background: #58833b; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      Verify My Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #9ca3af;">
                Or copy this link: <a href="${verifyUrl}" style="color: #58833b;">${verifyUrl}</a><br/>
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

  const green = '#58833b';  // BDA Forest Green
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
async function sendPasswordResetEmail(user, token, origin, customLink, kind = 'admin') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials missing — using Ethereal test SMTP for password reset email.');
  }

  const finalAppUrl = (origin || '').replace(/\/$/, '') ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    'https://rohit98k-payroll-portal.vercel.app';

  const resetUrl = customLink || `${finalAppUrl}/reset-password?token=${token}`;

  // Determine subject + greeting based on the recipient kind
  const isStaff = kind === 'staff';
  const subject = isStaff
    ? 'Set Up Your Staff Portal Password'
    : 'Reset Your PaySlip Pro Password';
  const greetingName = isStaff
    ? (user.fullName || user.email)
    : (user.companyName || user.email || 'there');
  const introLine = isStaff
    ? 'Welcome to the staff portal. Use the button below to set your portal password and start using your account.'
    : `We received a request to reset the password for your PaySlip Pro account linked to <strong>${user.email}</strong>.`;
  const buttonText = isStaff ? 'Set My Portal Password' : 'Reset My Password';
  const buttonColor = isStaff ? '#58833b' : '#1e3a5f';
  const headerColor = isStaff ? '#58833b' : '#1e3a5f';
  const headerSubtitle = isStaff ? 'Staff Portal Access' : 'Professional Payroll Management';

  console.log(`✉️ Sending ${isStaff ? 'staff portal ' : ''}password reset email to: ${user.email}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress(isStaff ? (user.user?.companyName || 'Your Company') : 'PaySlip Pro'),
    to: user.email,
    replyTo: sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER),
    subject,
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
            <td bgcolor="${headerColor}" style="padding: 40px 45px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">PaySlip Pro</h1>
              <p style="margin: 8px 0 0 0; color: ${isStaff ? '#d0e8c0' : '#a8c0d6'}; font-size: 14px;">${headerSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 45px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #374151;">Hi ${escapeHtml(greetingName)},</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                ${isStaff ? `An administrator has set up your staff portal access for <strong>${escapeHtml(user.user?.companyName || 'your company')}</strong>. ` : ''}${introLine}
              </p>
              <p style="margin: 0 0 30px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Click the button below to ${isStaff ? 'set your portal password' : 'set a new password'}. This link ${isStaff ? 'expires in <strong>15 minutes</strong>' : 'expires in <strong>1 hour</strong>'}.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: ${buttonColor}; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #9ca3af;">
                Or copy this link: <a href="${resetUrl}" style="color: ${buttonColor};">${resetUrl}</a><br/>
                ${isStaff ? 'If you did not expect this email, please contact your administrator.' : "If you didn't request a password reset, you can safely ignore this email."}
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

  // Add anti-spam headers + fix From name to match the actual sender domain.
  // Gmail often marks emails as spam when the From display name doesn't
  // match the sender's email domain (e.g. "BDA Technologies" <gmail.com>).
  mailOptions.headers = {
    'List-Unsubscribe': `<mailto:${sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER)}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'PaySlip Pro Mailer',
  };
  // Force the From name to match the actual sending domain. The company
  // name still appears in the email body (Hi, [Company Name] section).
  mailOptions.from = buildFromAddress('PaySlip Pro');

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📭 Password reset email preview available at: ${previewUrl}`);
      return previewUrl;
    }
    console.log(`✅ Password reset email accepted by SMTP`);
    console.log(`   To: ${user.email}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
    console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
    console.log(`   SMTP response: ${info.response}`);
    if (info.rejected && info.rejected.length > 0) {
      console.warn(`⚠️ Recipient ${info.rejected.join(', ')} was REJECTED. Email NOT delivered.`);
    }
    if (!info.accepted || info.accepted.length === 0) {
      console.warn(`⚠️ No recipients accepted the email. Email NOT delivered.`);
    }
    return null;
  } catch (err) {
    console.error(`❌ Password reset email SMTP error: ${err.message}`);
    throw err;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function sendMailWithRetry(transporter, mailOptions, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Send staff portal provisioning email with a password setup link
// ─────────────────────────────────────────────────────────────
async function sendStaffProvisionEmail(staff, tempPassword, setupUrl) {
  const to = String(staff?.email || '').trim().toLowerCase();
  const companyName = staff?.user?.companyName || 'Your Company';

  if (!isValidEmail(to)) {
    throw new Error('Staff email is missing or invalid.');
  }

  console.log(`✉️ Sending staff provision email to: ${to}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress(companyName),
    to,
    replyTo: sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER),
    subject: `Welcome to the ${companyName} Staff Portal`,
    html: buildStaffProvisionEmailHTML(staff, tempPassword, setupUrl),
    text: buildStaffProvisionEmailText(staff, tempPassword, setupUrl),
  };

  // Add headers that help email providers (especially Gmail) deliver to inbox
  // instead of spam. The key insight: when From display name doesn't match the
  // actual sender domain, Gmail often marks the message as spam/phishing.
  // Solution: use a generic "PaySlip Pro" display name (not the company name)
  // and include proper List-Unsubscribe + In-Reply-To headers.
  const senderDomain = (sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER) || '').split('@')[1] || 'localhost';
  mailOptions.headers = {
    'List-Unsubscribe': `<mailto:${sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER)}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'PaySlip Pro Mailer',
    'X-Entity-ID': `payslip-pro-${Date.now()}`,
  };
  // Override the From to use a clean name that matches the actual sender domain.
  // This is the #1 fix for Gmail spam-folder delivery.
  mailOptions.from = buildFromAddress('PaySlip Pro');

  try {
    const info = await sendMailWithRetry(transporter, mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📭 Staff provision email preview available at: ${previewUrl}`);
      return { previewUrl, info };
    }
    // Log SMTP delivery details so issues can be diagnosed
    console.log(`✅ Staff provision email accepted by SMTP server`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
    console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
    console.log(`   SMTP response: ${info.response}`);
    if (info.rejected && info.rejected.length > 0) {
      console.warn(`⚠️ Recipient ${info.rejected.join(', ')} was REJECTED by SMTP. Email NOT delivered.`);
    }
    if (!info.accepted || info.accepted.length === 0) {
      console.warn(`⚠️ No recipients accepted the email. Email NOT delivered.`);
    }
    return { previewUrl: null, info };
  } catch (err) {
    console.error(`❌ Staff provision email SMTP error: ${err.message}`);
    throw err;
  }
}

function buildStaffProvisionEmailHTML(staff, tempPassword, setupUrl) {
  const fullName = escapeHtml(staff?.fullName || 'there');
  const companyName = escapeHtml(staff?.user?.companyName || 'Your Company');
  const staffEmail = escapeHtml(staff?.email || '');
  const safeSetupUrl = escapeHtml(setupUrl || '');
  const safeTempPassword = escapeHtml(tempPassword);

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 32px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
          <tr><td height="6" bgcolor="#FFBE11" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#58833b" style="padding: 36px 42px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to the Staff Portal</h1>
              <p style="margin: 8px 0 0 0; color: #e6f2d8; font-size: 14px; font-weight: 600;">${companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 42px;">
              <p style="margin: 0 0 18px 0; font-size: 18px; font-weight: 800; color: #111827;">Hi ${fullName},</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.65;">
                You have been added to the team at <strong>${companyName}</strong>. Use the secure button below to set your portal password and complete your access.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Portal email: <strong>${staffEmail}</strong>
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${safeSetupUrl}" style="display: inline-block; background: #58833b; color: #ffffff; padding: 15px 34px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px;">
                      Set Up My Portal Access
                    </a>
                  </td>
                </tr>
              </table>
              ${safeTempPassword ? `
              <div style="margin: 24px 0 0 0; padding: 16px; border-radius: 10px; background: #fff7ed; border: 1px solid #fed7aa;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a3412; font-weight: 800;">Temporary password</p>
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 800; font-family: 'Courier New', monospace; letter-spacing: 1px;">${safeTempPassword}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #9a3412;">If you use this password to log in, you will be asked to change it immediately.</p>
              </div>
              ` : ''}
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                If the button does not work, copy and paste this link into your browser:<br/>
                <a href="${safeSetupUrl}" style="color: #58833b; font-weight: 700; word-break: break-all;">${safeSetupUrl}</a>
              </p>
              <p style="margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                This setup link is valid for 24 hours. If you did not expect this email, please contact your administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 22px 42px; text-align: center;">
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

function buildStaffProvisionEmailText(staff, tempPassword, setupUrl) {
  const companyName = staff?.user?.companyName || 'Your Company';
  const fullName = staff?.fullName || 'there';
  const staffEmail = staff?.email || '';
  const passwordLine = tempPassword ? `\n\nTemporary password: ${tempPassword}\nUse it to log in once, then set a new password.` : '';

  return `Hi ${fullName},\n\nYou have been added to the team at ${companyName}.\n\nPortal email: ${staffEmail}\n\nSet up your portal access here:\n${setupUrl}${passwordLine}\n\nThis setup link is valid for 24 hours. If you did not expect this email, please contact your administrator.`;
}

// ─────────────────────────────────────────────────────────────
// Team Member Onboarding email (no default password)
// Sent when an admin adds a new team member. The employee receives
// a one-time setup link and chooses their own password. The same
// passwordResetToken / passwordResetExpires fields on the Staff
// model are reused as the setup token (24h expiry).
// ─────────────────────────────────────────────────────────────
async function sendTeamMemberOnboarding(staff, setupUrl) {
  const to = String(staff?.email || '').trim().toLowerCase();
  const companyName = staff?.user?.companyName || 'Your Company';

  if (!isValidEmail(to)) {
    throw new Error('Staff email is missing or invalid.');
  }
  if (!setupUrl) {
    throw new Error('Setup link is required to send the onboarding email.');
  }

  console.log(`✉️ Sending team member onboarding email to: ${to}`);

  const transporter = await createSMTPTransporter();

  const mailOptions = {
    from: buildFromAddress(companyName),
    to,
    replyTo: sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER),
    subject: 'Welcome to Payroll Portal – Set Up Your Account',
    html: buildTeamMemberOnboardingEmailHTML(staff, setupUrl),
    text: buildTeamMemberOnboardingEmailText(staff, setupUrl),
  };

  // Anti-spam headers (same pattern as sendStaffProvisionEmail)
  mailOptions.headers = {
    'List-Unsubscribe': `<mailto:${sanitizeEmailValue(process.env.EMAIL_FROM) || sanitizeEmailValue(process.env.EMAIL_USER)}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'PaySlip Pro Mailer',
    'X-Entity-ID': `payslip-pro-${Date.now()}`,
  };
  // Force From display name to match sender domain — fixes Gmail spam delivery
  mailOptions.from = buildFromAddress('PaySlip Pro');

  try {
    const info = await sendMailWithRetry(transporter, mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📭 Team member onboarding email preview available at: ${previewUrl}`);
      return { previewUrl, info };
    }
    console.log(`✅ Team member onboarding email accepted by SMTP server`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Accepted: ${JSON.stringify(info.accepted)}`);
    console.log(`   Rejected: ${JSON.stringify(info.rejected)}`);
    console.log(`   SMTP response: ${info.response}`);
    if (info.rejected && info.rejected.length > 0) {
      console.warn(`⚠️ Recipient ${info.rejected.join(', ')} was REJECTED. Email NOT delivered.`);
    }
    if (!info.accepted || info.accepted.length === 0) {
      console.warn(`⚠️ No recipients accepted the email. Email NOT delivered.`);
    }
    return { previewUrl: null, info };
  } catch (err) {
    console.error(`❌ Team member onboarding email SMTP error: ${err.message}`);
    throw err;
  }
}

function buildTeamMemberOnboardingEmailHTML(staff, setupUrl) {
  const fullName = escapeHtml(staff?.fullName || 'there');
  const companyName = escapeHtml(staff?.user?.companyName || 'Your Company');
  const staffEmail = escapeHtml(staff?.email || '');
  const safeSetupUrl = escapeHtml(setupUrl || '');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Segoe UI', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6fa; padding: 32px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
          <tr><td height="6" bgcolor="#FFBE11" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#58833b" style="padding: 36px 42px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to the Payroll Portal</h1>
              <p style="margin: 8px 0 0 0; color: #e6f2d8; font-size: 14px; font-weight: 600;">${companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 42px;">
              <p style="margin: 0 0 18px 0; font-size: 18px; font-weight: 800; color: #111827;">Hi ${fullName},</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.65;">
                You have been added to the team at <strong>${companyName}</strong>. We're excited to have you on board!
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.65;">
                To get started, please set up your password using the secure button below. This link is unique to you and can only be used once.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your portal email: <strong>${staffEmail}</strong>
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${safeSetupUrl}" style="display: inline-block; background: #58833b; color: #ffffff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 16px; letter-spacing: 0.3px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 28px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                If the button does not work, copy and paste this link into your browser:<br/>
                <a href="${safeSetupUrl}" style="color: #58833b; font-weight: 700; word-break: break-all;">${safeSetupUrl}</a>
              </p>
              <p style="margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                This setup link is valid for <strong>24 hours</strong>. After you set your password, you can sign in to the Payroll Portal using the email above and your new password.<br/><br/>
                If you did not expect this email, please contact your administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding: 22px 42px; text-align: center;">
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

function buildTeamMemberOnboardingEmailText(staff, setupUrl) {
  const companyName = staff?.user?.companyName || 'Your Company';
  const fullName = staff?.fullName || 'there';
  const staffEmail = staff?.email || '';

  return `Hi ${fullName},

Welcome to ${companyName}! You have been added to the team on the Payroll Portal.

To get started, please set up your password by visiting the secure link below. This link is unique to you and can only be used once.

Portal email: ${staffEmail}

Set Your Password:
${setupUrl}

This setup link is valid for 24 hours. After you set your password, you can sign in to the Payroll Portal using the email above and your new password.

If you did not expect this email, please contact your administrator.

© 2026 PaySlip Pro. All rights reserved.`;
}

async function sendPunchOutReminderEmail(staff, loginUrl, details = {}) {
  console.log(`✉️ Sending punch-out reminder email to: ${staff.email}`);

  const transporter = await createSMTPTransporter();
  const {
    loginTime = 'N/A',
    shiftDate = 'N/A',
    duration = 'N/A',
    workStatus = 'In Progress',
    reason = 'Your shift has crossed the expected working window.',
    autoClosed = false,
    officeClosing = false
  } = details;

  const subject = officeClosing
    ? (autoClosed ? 'Attendance Auto-Closed at Office Closing Time' : 'Office Closed: Please Punch Out')
    : (autoClosed ? 'Shift Auto-Closed: Please Review Attendance' : 'Reminder: Please Punch Out for the Day');
  const headerTitle = autoClosed ? 'Attendance Updated' : 'Action Required';
  const headerSubtitle = officeClosing ? 'Office Closing Alert' : 'Shift Duration Alert';
  const durationLabel = autoClosed ? 'Logged Duration' : 'Current Duration';
  const statusLabel = autoClosed ? 'Final Status' : 'Current Status';
  const policyTitle = officeClosing ? 'Office Timing Policy' : 'Work Hours Policy';
  const policyBody = officeClosing
    ? `Office Hours: 10:30 AM to 7:00 PM IST<br/>
                    Closing Reminder: 7:00 PM IST<br/>
                    Grace Window: 30 minutes<br/>
                    Auto Punch-Out: 7:30 PM IST, recorded at 7:00 PM IST<br/>
                    Auto-closed attendance is flagged for HR/Admin review`
    : `Start Time: 10:30 AM<br/>
                    Half Day Threshold: Punch-in after 11:00 AM<br/>
                    Full Day: 8.5+ hours logged<br/>
                    Half Day: 4 to 7.9 hours logged<br/>
                    LOP: Less than 4 hours<br/>
                    Overtime: After 8.5h (Max 1h)`;
  const autoClosedMessage = officeClosing
    ? 'Your attendance was auto-closed at 7:00 PM IST because you were still punched in after the 30-minute office-closing grace window. Please contact HR/Admin if a correction is needed.'
    : 'Your shift has been auto-closed because it exceeded the maximum allowed duration. Please review your attendance and contact HR/Admin if correction is needed.';

  const mailOptions = {
    from: buildFromAddress('PaySlip Pro'),
    to: staff.email,
    subject,
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
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${headerTitle}</h1>
              <p style="margin: 8px 0 0 0; color: #a8c0d6; font-size: 14px;">${headerSubtitle}</p>
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
                <tr><td style="padding: 0 16px 14px; font-size: 13px; color: #111827;"><strong>${durationLabel}:</strong> ${duration}</td></tr>
                <tr><td style="padding: 0 16px 14px; font-size: 13px; color: #111827;"><strong>${statusLabel}:</strong> ${workStatus}</td></tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 30px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 13px; color: #7c2d12; line-height: 1.6;">
                    <strong>${policyTitle}</strong><br/>
                    ${policyBody}
                  </td>
                </tr>
              </table>
              ${autoClosed ? `
              <p style="margin: 0 0 30px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                ${autoClosedMessage}
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

module.exports = { sendPayslipEmail, sendVerificationEmail, sendPasswordResetEmail, sendStaffProvisionEmail, sendTeamMemberOnboarding, sendPunchOutReminderEmail };

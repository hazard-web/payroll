require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log('SMTP verified');
    const info = await transporter.sendMail({
      from: `PaySlip Pro <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Payslip SMTP test',
      text: 'If you see this, email sending works.',
    });
    console.log('Sent', info.messageId);
  } catch (err) {
    console.error('SMTP error:', err.message);
    process.exit(1);
  }
})();

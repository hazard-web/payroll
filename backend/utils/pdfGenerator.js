const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Color palette — Three-tone BDA brand scheme
// Primary: #58833b (Forest Green) — headers, net salary band, table headers
// Secondary: #e5ebdd (Soft Sage) — employee info panel, alternate rows, totals row
// Tertiary: #ffffff (White) — table body rows, page background
const COLORS = {
  primary: '#15803d',    // Accent Green — headers, badges, highlights
  sage: '#f0fdf4',       // Soft light green tint — backgrounds
  white: '#ffffff',      // White
  primaryText: '#ffffff', // White text on green backgrounds
  sageText: '#15803d',   // Green text on light backgrounds
  greenText: '#15803d',  // Green text
  gray: '#6b7280',       // Muted gray for labels
  lightGray: '#e5e7eb',  // Light gray border
  darkGray: '#111827',   // Near-black for values
  earningGreen: '#15803d', // Green for earnings
  deductionRed: '#b91c1c', // Red for deductions
  // Legacy aliases for compatibility
  navy: '#15803d',
  gold: '#f0fdf4',
  lightGold: '#f0fdf4',
  offWhite: '#f0fdf4',
  darkGray2: '#1f2937',
  green: '#15803d',
  red: '#b91c1c',
  tableHeader: '#15803d',
  tableRow1: '#ffffff',
  tableRow2: '#ffffff',
  netBg: '#f0fdf4',
  totalNetRow: '#f0fdf4',
};

// Font paths (Using process.cwd() for Vercel/production resilience)
const FONT_REGULAR_PATH = path.resolve(process.cwd(), 'backend/assets/fonts/Inter-Regular.ttf');
const FONT_BOLD_PATH = path.resolve(process.cwd(), 'backend/assets/fonts/Inter-Bold.ttf');

/**
 * Format a number as Indian Rupee string
 */
function formatINR(amount) {
  const num = parseFloat(amount) || 0;
  if (isNaN(num)) return 'Rs. 0.00';
  return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Convert number to words (Indian system)
 */
function numberToWords(num) {
  const amount = parseFloat(num) || 0;
  if (isNaN(amount) || amount === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (isNaN(n) || n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
  }

  const integer = Math.floor(amount);
  const decimal = Math.round((amount - integer) * 100);
  let words = convert(integer).trim() || 'Zero';
  words = words + ' Rupees';
  if (decimal > 0) words += ' and ' + convert(decimal).trim() + ' Paise';
  words += ' Only';
  return words;
}

/**
 * Core drawing logic shared between direct download and email attachments.
 * Embeds custom fonts for layout stability with robust fallback.
 */
function drawPayslip(doc, payslip) {
  let fontRegular = 'Helvetica';
  let fontBold = 'Helvetica-Bold';

  // Register fonts defensively with double-layered catch logic
  try {
    if (fs.existsSync(FONT_REGULAR_PATH)) {
      try {
        doc.registerFont('Inter', FONT_REGULAR_PATH);
        fontRegular = 'Inter';
      } catch (err) {
        console.error(`❌ Inter Regular registration failed (Format Error): ${err.message}`);
        fontRegular = 'Helvetica'; // Explicit fallback on format error
      }
    } else {
      console.warn('⚠️ Inter Regular font file not found on disk.');
    }

    if (fs.existsSync(FONT_BOLD_PATH)) {
      try {
        doc.registerFont('Inter-Bold', FONT_BOLD_PATH);
        fontBold = 'Inter-Bold';
      } catch (err) {
        console.error(`❌ Inter Bold registration failed (Format Error): ${err.message}`);
        fontBold = 'Helvetica-Bold'; // Explicit fallback on format error
      }
    } else {
      console.warn('⚠️ Inter Bold font file not found on disk.');
    }
  } catch (err) {
    console.error('CRITICAL: Font registration logic crash:', err.message);
    fontRegular = 'Helvetica';
    fontBold = 'Helvetica-Bold';
  }

  // Final validation of font choice
  try {
    doc.font(fontRegular);
  } catch (e) {
    console.error('Emergency font switch to Helvetica');
    doc.font('Helvetica');
    fontRegular = 'Helvetica';
  }

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── HEADER SECTION ──────────────────────────────────────────────────────
  // Stylized hexagonal logo on left
  doc.path('M 56 40 L 70 48 L 70 64 L 56 72 L 42 64 L 42 48 Z').fill('#15803d');
  doc.path('M 56 44 L 66 50 L 66 62 L 56 68 L 46 62 L 46 50 Z').fill(COLORS.white);
  doc.path('M 56 48 L 62 52 L 62 60 L 56 64 L 50 60 L 50 52 Z').fill('#15803d');

  // Company Name
  doc.font(fontBold)
     .fontSize(14)
     .fillColor('#111827')
     .text('BDA TECHNOLOGIES', 80, 44);
  doc.font(fontRegular)
     .fontSize(8.5)
     .fillColor('#15803d')
     .text('P V T.   L T D.', 80, 59, { characterSpacing: 1.5 });

  // Payslip title on right
  doc.font(fontBold)
     .fontSize(22)
     .fillColor('#15803d')
     .text('Payslip', MARGIN + CONTENT_W * 0.6, 40, { width: CONTENT_W * 0.4, align: 'right' });
  doc.font(fontRegular)
     .fontSize(10)
     .fillColor('#1f2937')
     .text(`${payslip.month} ${payslip.year}`, MARGIN + CONTENT_W * 0.6, 64, { width: CONTENT_W * 0.4, align: 'right' });

  // Header separator line
  doc.moveTo(MARGIN, 86).lineTo(PAGE_W - MARGIN, 86).strokeColor('#e5e7eb').lineWidth(1.2).stroke();

  // ── METADATA ROW (Y: 96 to 132) ───────────────────────────────────────────
  // Pay Period
  doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text('Pay Period', MARGIN, 96);
  doc.font(fontBold).fontSize(8.5).fillColor(COLORS.darkGray).text(`01 ${payslip.month.slice(0, 3)} ${payslip.year} - 30 ${payslip.month.slice(0, 3)} ${payslip.year}`, MARGIN + 60, 96);
  
  // Pay Date
  doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text('Pay Date', MARGIN, 114);
  doc.font(fontBold).fontSize(8.5).fillColor(COLORS.darkGray).text(payslip.payDate, MARGIN + 60, 114);

  // Vertical Separator Line
  doc.moveTo(MARGIN + 185, 96).lineTo(MARGIN + 185, 126).strokeColor('#e5e7eb').lineWidth(1).stroke();

  // Pay Person (Employee ID)
  doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text('Pay Person', MARGIN + 200, 96);
  doc.font(fontBold).fontSize(8.5).fillColor(COLORS.darkGray).text(payslip.employeeId, MARGIN + 260, 96);

  // BDA Company Details on right
  const compDetailsX = MARGIN + CONTENT_W * 0.58;
  doc.font(fontBold).fontSize(8).fillColor('#111827').text('BDA TECHNOLOGIES PVT. LTD.', compDetailsX, 96, { width: CONTENT_W * 0.42, align: 'right' });
  doc.font(fontRegular).fontSize(7.2).fillColor('#4b5563')
     .text('Plot No. 45, Sector 4, Vaishali,', compDetailsX, 107, { width: CONTENT_W * 0.42, align: 'right' })
     .text('Ghaziabad, Uttar Pradesh - 201010, India', compDetailsX, 117, { width: CONTENT_W * 0.42, align: 'right' })
     .text('Email: hr@bdatechnologies.com | Web: www.bdatechnologies.com', compDetailsX, 127, { width: CONTENT_W * 0.42, align: 'right' });

  // ── EMPLOYEE DETAILS SECTION ───────────────────────────────────────────
  let y = 142;
  // Rounded Box container
  doc.roundedRect(MARGIN, y, CONTENT_W, 90, 6).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  // Icon avatar
  doc.circle(MARGIN + 20, y + 17, 10).fill('#f0fdf4');
  doc.circle(MARGIN + 20, y + 15, 3).fill('#15803d');
  doc.path(`M ${MARGIN+15} ${y+23} Q ${MARGIN+20} ${y+19} ${MARGIN+25} ${y+23} Z`).fill('#15803d');

  // Box Header
  doc.font(fontBold).fontSize(8.5).fillColor('#15803d').text('EMPLOYEE DETAILS', MARGIN + 36, y + 13);

  // Col grid
  const empCol1 = [
    ['Employee Name', payslip.employeeName],
    ['Designation', payslip.designation],
    ['Department', payslip.department],
    ['Date of Joining', payslip.dateOfJoining || '—'],
  ];
  const empCol2 = [
    ['PAN Number', payslip.panNumber || '—'],
    ['PF Number', payslip.pfNumber || '—'],
    ['Bank Account', payslip.bankAccount ? `**** ${payslip.bankAccount.slice(-4)}` : '—'],
    ['Bank Name', payslip.bankName || '—'],
  ];

  empCol1.forEach((f, idx) => {
    const fy = y + 36 + idx * 12.5;
    doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text(f[0], MARGIN + 20, fy);
    doc.font(fontBold).fontSize(8).fillColor(COLORS.darkGray).text(f[1], MARGIN + 115, fy);
  });

  empCol2.forEach((f, idx) => {
    const fy = y + 36 + idx * 12.5;
    doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text(f[0], MARGIN + 270, fy);
    doc.font(fontBold).fontSize(8).fillColor(COLORS.darkGray).text(f[1], MARGIN + 355, fy);
  });

  // ── ATTENDANCE SUMMARY SECTION ───────────────────────────────────────────
  y += 98;
  const daysData = [
    { label: 'Working Days', val: payslip.workingDays, type: 'working' },
    { label: 'Paid Days', val: payslip.paidDays, type: 'paid' },
    { label: 'Loss of Pay Days', val: payslip.workingDays - payslip.paidDays, type: 'lop' },
  ];

  daysData.forEach((item, idx) => {
    const bx = MARGIN + idx * 175;
    doc.roundedRect(bx, y, 165, 36, 5).strokeColor('#e5e7eb').lineWidth(1).stroke();
    
    // Circle container
    doc.circle(bx + 18, y + 18, 9).fill('#f0fdf4');
    doc.rect(bx + 14, y + 14, 8, 8).strokeColor('#15803d').lineWidth(1).stroke();
    doc.moveTo(bx + 14, 16 + y).lineTo(bx + 22, 16 + y).stroke();
    if (item.type === 'paid') {
      doc.moveTo(bx + 16, y + 18).lineTo(bx + 18, y + 20).lineTo(bx + 21, y + 17).stroke();
    } else if (item.type === 'lop') {
      doc.moveTo(bx + 16, y + 17).lineTo(bx + 20, y + 21).stroke();
      doc.moveTo(bx + 20, y + 17).lineTo(bx + 16, y + 21).stroke();
    } else {
      doc.moveTo(bx + 16, y + 19).lineTo(bx + 20, y + 19).stroke();
    }

    doc.font(fontRegular).fontSize(7).fillColor(COLORS.gray).text(item.label, bx + 34, y + 8);
    doc.font(fontBold).fontSize(11).fillColor('#15803d').text(String(item.val), bx + 34, y + 18);
  });

  // ── EARNINGS & DEDUCTIONS TABLES ───────────────────────────────────────────
  y += 48;
  const tableW = 250;
  const leftCol = MARGIN;
  const rightCol = MARGIN + 265;

  // Headers
  doc.rect(leftCol, y, tableW, 18).fill('#15803d');
  doc.rect(rightCol, y, tableW, 18).fill('#15803d');

  doc.font(fontBold).fontSize(7.5).fillColor(COLORS.white)
     .text('EARNINGS', leftCol + 10, y + 5)
     .text('AMOUNT (Rs.)', leftCol + 160, y + 5, { width: 80, align: 'right' })
     .text('DEDUCTIONS', rightCol + 10, y + 5)
     .text('AMOUNT (Rs.)', rightCol + 160, y + 5, { width: 80, align: 'right' });

  y += 18;

  const earnings = payslip.employmentType === 'intern' 
    ? [['Monthly Stipend', payslip.stipend || payslip.grossEarnings]]
    : [
        ['Basic Salary (50%)', payslip.basicSalary],
        ['House Rent Allowance (40%)', payslip.hra],
        ['Special Allowance', payslip.specialAllowance],
        ['Employer PF Contribution', payslip.employerPF],
      ];

  if (payslip.otherEarnings > 0) earnings.push([payslip.otherEarningsLabel || 'Other Earnings', payslip.otherEarnings]);

  const deductions = [
    ['Employee PF', payslip.providentFund],
    ['ESI', payslip.esi],
    ['Professional Tax', payslip.professionalTax],
    ['Tax Deducted (TDS)', payslip.tds],
    ['Loan Deduction', payslip.loanDeduction],
    [payslip.otherDeductionsLabel || 'Other Deductions', payslip.otherDeductions],
  ].filter((d) => d[1] > 0);

  const maxRows = Math.max(earnings.length, deductions.length, 5);
  const ROW_H = 16;

  for (let i = 0; i < maxRows; i++) {
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    doc.rect(leftCol, y, tableW, ROW_H).fill(bg);
    doc.rect(rightCol, y, tableW, ROW_H).fill(bg);

    if (earnings[i]) {
      doc.font(fontRegular).fontSize(7.5).fillColor('#374151').text(earnings[i][0], leftCol + 10, y + 4);
      doc.font(fontBold).fontSize(7.5).fillColor('#111827').text(formatINR(earnings[i][1]), leftCol + 160, y + 4, { width: 80, align: 'right' });
    }
    if (deductions[i]) {
      doc.font(fontRegular).fontSize(7.5).fillColor('#374151').text(deductions[i][0], rightCol + 10, y + 4);
      doc.font(fontBold).fontSize(7.5).fillColor('#111827').text(formatINR(deductions[i][1]), rightCol + 160, y + 4, { width: 80, align: 'right' });
    }
    y += ROW_H;
  }

  // Totals Row
  doc.rect(leftCol, y, tableW, 18).fill('#f0fdf4');
  doc.rect(rightCol, y, tableW, 18).fill('#f0fdf4');

  doc.font(fontBold).fontSize(7.5).fillColor('#15803d')
     .text('GROSS EARNINGS', leftCol + 10, y + 5)
     .text(formatINR(payslip.grossEarnings), leftCol + 160, y + 5, { width: 80, align: 'right' })
     .text('TOTAL DEDUCTIONS', rightCol + 10, y + 5)
     .text(formatINR(payslip.totalDeductions), rightCol + 160, y + 5, { width: 80, align: 'right' });

  y += 28;

  // ── NET SALARY PAYABLE ───────────────────────────────────────────────────
  doc.roundedRect(MARGIN, y, CONTENT_W, 40, 5).fill('#f0fdf4');
  doc.roundedRect(MARGIN, y, CONTENT_W, 40, 5).strokeColor('#d1fae5').lineWidth(1).stroke();

  // Green circle and wallet icon on left
  doc.circle(MARGIN + 18, y + 20, 10).fill('#15803d');
  doc.rect(MARGIN + 13, y + 16, 10, 8, 1.5).fill(COLORS.white);
  doc.circle(MARGIN + 18, y + 20, 2).fill('#15803d');

  doc.font(fontBold).fontSize(8.5).fillColor('#15803d').text(payslip.employmentType === 'intern' ? 'NET STIPEND PAYABLE' : 'NET SALARY PAYABLE', MARGIN + 36, y + 8);
  doc.font(fontRegular).fontSize(7.5).fillColor('#4b5563').text(`(${numberToWords(payslip.netSalary)})`, MARGIN + 36, y + 22, { width: CONTENT_W - 200 });
  
  doc.font(fontBold).fontSize(14).fillColor('#15803d')
     .text(formatINR(payslip.netSalary), MARGIN + CONTENT_W - 190, y + 13, { width: 180, align: 'right' });

  // Notes
  y += 50;
  if (payslip.notes) {
    doc.font(fontBold).fontSize(7.5).fillColor('#15803d').text('Notes:', MARGIN, y);
    doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.gray).text(payslip.notes, MARGIN + 40, y, { width: CONTENT_W - 40 });
    y += Math.max(15, doc.heightOfString(payslip.notes, { width: CONTENT_W - 40 }));
  }

  // Centered thank you message
  y += 10;
  doc.font(fontBold).fontSize(9).fillColor('#15803d').text('Thank you for your hard work and dedication!', MARGIN, y, { width: CONTENT_W, align: 'center' });

  // Contact details
  y += 24;
  doc.font(fontRegular).fontSize(7).fillColor('#4b5563').text(`✉  ${payslip.companyEmail || 'hr@bdatechnologies.com'}`, MARGIN, y, { width: 170, align: 'center' });
  doc.font(fontRegular).fontSize(7).fillColor('#4b5563').text(`🌐  ${payslip.companyWebsite || 'www.bdatechnologies.com'}`, MARGIN + 172, y, { width: 170, align: 'center' });
  doc.font(fontRegular).fontSize(7).fillColor('#4b5563').text(`📞  ${payslip.companyPhone || '+91 120 456 7890'}`, MARGIN + 344, y, { width: 170, align: 'center' });

  // Solid green bottom bar
  doc.rect(0, PAGE_H - 24, PAGE_W, 24).fill('#15803d');
  doc.font(fontRegular).fontSize(7.5).fillColor(COLORS.white)
     .text('This is a system generated payslip and does not require any signature.', 0, PAGE_H - 16, { width: PAGE_W, align: 'center' });

  doc.end();
}

/**
 * Generate a payslip PDF and pipe it to the response
 */
function generatePayslipPDF(payslip, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Payslip - ${payslip.employeeName} - ${payslip.month} ${payslip.year}`,
      Author: payslip.companyName,
      Subject: 'Payslip',
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf"`
  );

  doc.pipe(res);
  try {
    drawPayslip(doc, payslip);
  } catch (err) {
    console.error('CRITICAL: PDF drawing error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Critical error during PDF generation', details: err.message });
    }
  }
}

/**
 * Main PDF drawing function (Internal & Exported)
 */
module.exports = { 
  generatePayslipPDF,
  drawPayslip 
};

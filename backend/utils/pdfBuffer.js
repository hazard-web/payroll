const PDFDocument = require('pdfkit');
const { drawPayslip } = require('./pdfGenerator');

/**
 * Generates payslip PDF as a Buffer (for email attachments).
 * Uses the SAME unified drawing logic as direct downloads.
 */
function generatePayslipPDFBuffer(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Payslip - ${payslip.employeeName} - ${payslip.month} ${payslip.year}`,
          Author: payslip.companyName,
          Subject: 'Salary Slip',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on('error', (err) => {
        console.error('❌ PDFKit stream error:', err.message);
        reject(err);
      });

      drawPayslip(doc, payslip);
    } catch (err) {
      console.error('❌ PDF buffer generation failed:', err.message);
      reject(err);
    }
  });
}

module.exports = { generatePayslipPDFBuffer };

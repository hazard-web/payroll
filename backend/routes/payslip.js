const express = require('express');
const router = express.Router();
const Payslip = require('../models/Payslip');
const { generatePayslipPDF } = require('../utils/pdfGenerator');
const { sendPayslipEmail } = require('../utils/emailService');
const { authCombined } = require('../utils/authMiddleware');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/logger');

// Apply auth middleware to all routes
router.use(authCombined);

// ─────────────────────────────────────────────────────────────
// POST /api/payslips — Create a new payslip
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Defensive numeric casting for all numeric fields
    const numericFields = [
      'annualCTC', 'stipend', 'employerPF', 'basicSalary', 'hra',
      'conveyanceAllowance', 'medicalAllowance', 'specialAllowance', 'otherEarnings',
      'providentFund', 'esi', 'tds', 'professionalTax', 'loanDeduction', 'otherDeductions',
      'grossEarnings', 'totalDeductions', 'netSalary',
      'workingDays', 'paidDays', 'year'
    ];

    const { automationEnabled } = req.body;
    const payslipData = { ...req.body, user: userId };

    numericFields.forEach(field => {
      const val = parseFloat(payslipData[field]);
      payslipData[field] = isNaN(val) ? 0 : val;
    });

    // If automation is OFF, force statutory deductions to 0
    if (automationEnabled === false) {
      ['providentFund', 'esi', 'tds', 'professionalTax'].forEach(f => {
        payslipData[f] = 0;
      });
    }

    // Inherit company logo from user profile if not provided
    if (!payslipData.companyLogo && req.user.companyLogo) {
      payslipData.companyLogo = req.user.companyLogo;
    }

    // Always inject/override company profile fields from the authenticated user.
    // This guarantees the PDF shows the correct company details even if the
    // frontend payload is missing or stale values from the profile page.
    const companyProfileFields = [
      'companyName', 'companyAddress', 'companyEmail',
      'companyPhone', 'companyCIN', 'companyGST', 'companyWebsite',
    ];
    companyProfileFields.forEach(field => {
      if (req.user[field]) {
        payslipData[field] = req.user[field];
      }
    });
    // Logo: always prefer the user's saved logo over whatever was in the payload
    if (req.user.companyLogo) {
      payslipData.companyLogo = req.user.companyLogo;
    }

    const payslip = new Payslip(payslipData);
    await payslip.save();

    await logActivity(userId, 'PAYSLIP_GENERATED', `Generated payslip for ${payslip.employeeName} (${payslip.month} ${payslip.year})`, { payslipId: payslip._id });

    console.log(`✅ Payslip saved: ${payslip._id} for ${payslip.employeeName}`);
    res.status(201).json({ success: true, message: 'Payslip created successfully', data: payslip });
  } catch (err) {
    console.error('❌ Create payslip error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errors.join(', '),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create payslip: ' + err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payslips — List all payslips (with search/filter)
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, month, year, employeeId, page = 1, limit = 10 } = req.query;

    const filter = { user: req.user._id };
    if (employeeId) filter.employeeId = employeeId;
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { employeeName: { $regex: sanitizedSearch, $options: 'i' } },
        { employeeId: { $regex: sanitizedSearch, $options: 'i' } },
        { department: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    if (month && month !== 'All Months') filter.month = month;
    if (year && year !== 'All Years') {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) filter.year = yearNum;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Run count + page fetch in parallel — they're independent queries.
    const [total, payslips] = await Promise.all([
      Payslip.countDocuments(filter),
      Payslip.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('employeeName employeeId designation department month year netSalary emailSent createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: payslips,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List payslips error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payslips/latest-paydate?employeeId=XXX
// Returns the payDate of the most recent payslip for a given employee.
// Used by the payslip form to auto-calculate working days for the next period.
// MUST stay above /:id to avoid Express treating "latest-paydate" as a MongoDB ObjectId.
// ─────────────────────────────────────────────────────────────
router.get('/latest-paydate', async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.json({ success: true, payDate: null });
    const latest = await Payslip.findOne({ user: req.user._id, employeeId })
      .sort({ createdAt: -1 })
      .select('payDate')
      .lean();
    res.json({ success: true, payDate: latest?.payDate || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch latest pay date' });
  }
});

// ─────────────────────────────────────────────────────────────
// BUG FIX: /stats/summary MUST be before /:id to prevent Express
// matching "stats" as a MongoDB ObjectId param (causes a guaranteed crash)
// ─────────────────────────────────────────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const twelveHoursAgo = new Date(Date.now() - 12 * 3600000);

    // Collapse all six previously-sequential queries into two parallel calls:
    //  • one $facet aggregation for ALL Payslip-derived metrics
    //  • Promise.all for the Staff/Attendance collections
    const [payslipStats, [totalEmployees, activePortals, employeeCount, internCount, flaggedAttendance]] =
      await Promise.all([
        Payslip.aggregate([
          { $match: { user: userId } },
          {
            $facet: {
              total: [{ $count: 'count' }],
              thisMonth: [
                { $match: { month: monthName, year } },
                { $count: 'count' },
              ],
              emailsSent: [
                { $match: { emailSent: true } },
                { $count: 'count' },
              ],
              netSalary: [
                { $group: { _id: null, totalNet: { $sum: '$netSalary' }, avgNet: { $avg: '$netSalary' } } },
              ],
            },
          },
        ]),
        Promise.all([
          Staff.countDocuments({ user: userId }).hint({ user: 1, type: 1 }),
          Staff.countDocuments({ user: userId, isPortalEnabled: true }).hint({ user: 1, isPortalEnabled: 1 }),
          Staff.countDocuments({ user: userId, type: 'Employee' }).hint({ user: 1, type: 1 }),
          Staff.countDocuments({ user: userId, type: 'Intern' }).hint({ user: 1, type: 1 }),
          Attendance.countDocuments({
            admin: userId,
            $or: [
              { status: 'flagged' },
              { status: 'incomplete', punchIn: { $lt: twelveHoursAgo } },
            ],
          }).hint({ admin: 1, status: 1, punchIn: -1 }),
        ]),
      ]);

    const ps = payslipStats[0] || {};
    const total = ps.total?.[0]?.count || 0;
    const thisMonthCount = ps.thisMonth?.[0]?.count || 0;
    const emailsSent = ps.emailsSent?.[0]?.count || 0;
    const netAgg = ps.netSalary?.[0] || { totalNet: 0, avgNet: 0 };

    res.json({
      success: true,
      data: {
        totalPayslips: total,
        thisMonthPayslips: thisMonthCount,
        emailsSent,
        totalEmployees,
        activePortals,
        workforceSplit: { employees: employeeCount, interns: internCount },
        attendanceFlags: flaggedAttendance,
        totalPayroll: netAgg.totalNet || 0,
        avgSalary: Math.round(netAgg.avgNet || 0),
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payslips/:id — Get a single payslip
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, user: req.user._id });
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }
    res.json({ success: true, data: payslip });
  } catch (err) {
    console.error('Get payslip error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslip' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/payslips/:id — Update a payslip (sanitized fields only)
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, user: req.user._id });
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // BUG FIX: Whitelist allowed fields. Never allow 'user' to be overwritten.
    const allowedFields = [
      'employeeName', 'employeeId', 'designation', 'department', 'employeeEmail',
      'dateOfJoining', 'bankAccount', 'bankName', 'panNumber', 'pfNumber',
      'month', 'year', 'payDate', 'workingDays', 'paidDays',
      'basicSalary', 'hra', 'conveyanceAllowance', 'medicalAllowance', 'specialAllowance',
      'otherEarnings', 'otherEarningsLabel', 'employerPF', 'stipend', 'annualCTC',
      'providentFund', 'esi', 'tds', 'professionalTax', 'loanDeduction',
      'otherDeductions', 'otherDeductionsLabel', 'notes', 'companyLogo',
      'companyName', 'companyAddress', 'companyEmail', 'companyPhone', 'companyCIN', 'companyGST', 'companyWebsite',
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) payslip[field] = req.body[field];
    });

    await payslip.save();
    res.json({ success: true, message: 'Payslip updated', data: payslip });
  } catch (err) {
    console.error('Update payslip error:', err);
    res.status(500).json({ success: false, message: 'Failed to update payslip' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/payslips/:id — Delete a payslip
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }
    res.json({ success: true, message: 'Payslip deleted successfully' });
  } catch (err) {
    console.error('Delete payslip error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete payslip' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payslips/:id/download — Download payslip as PDF
// ─────────────────────────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    let payslip;
    if (req.userType === 'staff') {
      // Staff can only download their own pushed payslip
      payslip = await Payslip.findOne({ 
        _id: req.params.id, 
        employeeId: req.staff.employeeId,
        isPushedToPortal: true 
      });
    } else {
      // Admin can download any payslip belonging to their company
      payslip = await Payslip.findOne({ _id: req.params.id, user: req.user._id });
    }

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found or access denied' });
    }
    generatePayslipPDF(payslip, res);
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + err.message });
    }
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payslips/:id/email — Email payslip to employee
// ─────────────────────────────────────────────────────────────
router.post('/:id/email', async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, user: req.user._id });
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const targetEmail = req.body.email || payslip.employeeEmail;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email address specified.' });
    }

    const payslipToSend = { ...payslip.toObject(), employeeEmail: targetEmail };

    await sendPayslipEmail(payslipToSend);
    console.log(`✅ Email delivered to: ${targetEmail}`);

    payslip.emailSent = true;
    payslip.emailSentAt = new Date();
    await payslip.save();

    await logActivity(req.user._id, 'EMAIL_SENT', `Emailed payslip to ${targetEmail} (${payslip.employeeName})`, { payslipId: payslip._id });

    res.json({
      success: true,
      message: `Payslip emailed successfully to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (err) {
    console.error('❌ Email send error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to send email.',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payslips/bulk-email-month — Bulk email all unsent slips for a month
// ─────────────────────────────────────────────────────────────
router.post('/bulk-email-month', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

    const unsentSlips = await Payslip.find({
      user: req.user._id,
      month,
      year: parseInt(year),
      emailSent: { $ne: true }
    });

    if (unsentSlips.length === 0) {
      return res.json({ success: true, message: 'No unsent payslips found for this period.', count: 0 });
    }

    // Process in parallel with error handling for each
    const results = await Promise.allSettled(unsentSlips.map(async (p) => {
      if (!p.employeeEmail) throw new Error(`No email for ${p.employeeName}`);
      await sendPayslipEmail(p);
      p.emailSent = true;
      p.emailSentAt = new Date();
      await p.save();
      return p.employeeEmail;
    }));

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful > 0) {
      await logActivity(req.user._id, 'BULK_EMAIL', `Bulk emailed ${successful} payslips for ${month} ${year}`, { successful, failed });
    }

    res.json({
      success: true,
      message: `Bulk email complete. ${successful} sent, ${failed} failed.`,
      count: successful,
      failedCount: failed
    });
  } catch (err) {
    console.error('Bulk email error:', err);
    res.status(500).json({ success: false, message: 'Bulk operation failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payslips/:id/push — Push payslip to staff portal
// ─────────────────────────────────────────────────────────────
router.post('/:id/push', async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, user: req.user._id });
    if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found' });

    payslip.isPushedToPortal = !payslip.isPushedToPortal;
    await payslip.save();

    const action = payslip.isPushedToPortal ? 'Pushed to portal' : 'Removed from portal';
    await logActivity(req.user._id, 'PAYSLIP_PUSHED', `${action}: ${payslip.employeeName} (${payslip.month} ${payslip.year})`, { payslipId: payslip._id });

    if (payslip.isPushedToPortal) {
      const staff = await Staff.findOne({ user: req.user._id, employeeId: payslip.employeeId });
      if (staff) {
        await new Notification({
          admin: req.user._id,
          staff: staff._id,
          recipientType: 'staff',
          type: 'PAYSLIP_PUSHED',
          referenceId: payslip._id,
          message: `Your payslip for ${payslip.month} ${payslip.year} is now available. Check My Payslips.`
        }).save();
      }
    }

    res.json({ success: true, message: action, isPushed: payslip.isPushedToPortal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Push operation failed' });
  }
});

module.exports = router;

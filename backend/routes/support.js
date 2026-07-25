const express = require('express');
const router = express.Router();
const SupportRequest = require('../models/SupportRequest');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Payslip = require('../models/Payslip');
const Staff = require('../models/Staff');
const Notification = require('../models/Notification');
const { authStaff } = require('./staffPortal');
const { auth: authAdmin } = require('./auth');

// Helper: start of today UTC
const getStartOfDay = (dateString = null) => {
  if (dateString) {
    const d = new Date(dateString);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));
};

// ─────────────────────────────────────────────────────────────
// POST /api/support — Staff submits a support request
// ─────────────────────────────────────────────────────────────
router.post('/', authStaff, async (req, res) => {
  try {
    const { requestType, message } = req.body;

    if (!requestType) {
      return res.status(400).json({ success: false, message: 'Request type is required' });
    }

    const today = getStartOfDay();

    // Only link attendance for attendance-related requests
    let attendanceId;
    if (requestType === 'Attendance / Punch Issue') {
      const attendance = await Attendance.findOne({
        staff: req.staff._id,
        date: today
      });
      attendanceId = attendance ? attendance._id : undefined;
    }

    const supportRequest = new SupportRequest({
      admin: req.staff.user._id,
      staff: req.staff._id,
      attendanceId,
      date: today,
      requestType,
      message: message || ''
    });

    await supportRequest.save();

    // Notify the admin
    await Notification.create({
      admin: req.staff.user._id,
      staff: req.staff._id,
      recipientType: 'admin',
      type: 'OTHER',
      referenceId: supportRequest._id,
      message: `${req.staff.fullName} submitted a support request: "${requestType}"`
    });

    res.status(201).json({ success: true, message: 'Support request submitted.', data: supportRequest });
  } catch (err) {
    console.error('Support request error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit support request' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/support/me — Staff views their own requests
// ─────────────────────────────────────────────────────────────
router.get('/me', authStaff, async (req, res) => {
  try {
    const requests = await SupportRequest.find({ staff: req.staff._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Fetch own support requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch support requests' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/support/admin — Admin views all support requests
// ─────────────────────────────────────────────────────────────
router.get('/admin', authAdmin, async (req, res) => {
  try {
    const requests = await SupportRequest.find({ admin: req.user._id })
      .populate('staff', 'fullName employeeId designation email')
      .populate('attendanceId', 'punchIn punchOut status totalHours overtimeHours date')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Admin fetch support requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch support requests' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/support/admin/:id/context — Fetch type-specific context
// ─────────────────────────────────────────────────────────────
router.get('/admin/:id/context', authAdmin, async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findOne({
      _id: req.params.id,
      admin: req.user._id
    }).populate('staff', 'fullName employeeId designation email');

    if (!supportRequest) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    const staffId = supportRequest.staff._id;
    const type = supportRequest.requestType;
    let context = { type, data: null };

    if (type === 'Attendance / Punch Issue') {
      // Return the linked attendance record (or recent ones for that staff)
      if (supportRequest.attendanceId) {
        context.data = await Attendance.findById(supportRequest.attendanceId)
          .select('punchIn punchOut status totalHours overtimeHours date');
      } else {
        // Fallback: recent 3 attendance records
        context.data = await Attendance.find({ staff: staffId })
          .sort({ date: -1 })
          .limit(3)
          .select('punchIn punchOut status totalHours date');
      }
    } else if (type === 'Leave Request Issue') {
      context.data = await LeaveRequest.find({ staff: staffId, admin: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type startDate endDate status reason adminNotes createdAt');
    } else if (type === 'Payslip / Salary Issue') {
      const staffDoc = await Staff.findById(staffId).select('employeeId');
      if (staffDoc) {
        context.data = await Payslip.find({ user: req.user._id, employeeId: staffDoc.employeeId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('employeeName month year netSalary grossEarnings totalDeductions emailSent createdAt');
      }
    }
    // For IT/Technical, HR/Policy, Other — message is sufficient, no linked data

    res.json({ success: true, data: context });
  } catch (err) {
    console.error('Support context error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch context' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/support/admin/:id/approve — Approve + conditionally reset punch-out
// ─────────────────────────────────────────────────────────────
router.put('/admin/:id/approve', authAdmin, async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findOne({
      _id: req.params.id,
      admin: req.user._id
    });

    if (!supportRequest) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    if (supportRequest.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Only reset attendance for attendance-type requests
    if (supportRequest.requestType === 'Attendance / Punch Issue' && supportRequest.attendanceId) {
      const attendance = await Attendance.findById(supportRequest.attendanceId);
      if (attendance) {
        attendance.punchOut = undefined;
        attendance.status = 'incomplete';
        attendance.totalHours = 0;
        attendance.overtimeHours = 0;
        await attendance.save();
      }
    }

    // Update support request
    const { adminNote } = req.body;
    supportRequest.status = 'Approved';
    if (adminNote) supportRequest.adminNote = adminNote;
    await supportRequest.save();

    // Notify staff — message varies by type
    const approvalMessages = {
      'Attendance / Punch Issue': 'Your punch-out reset has been approved. You can now punch out again.',
      'Leave Request Issue': 'Your leave-related support request has been approved.',
      'Payslip / Salary Issue': 'Your payslip/salary support request has been approved.',
      'IT / Technical Problem': 'Your IT support request has been approved and is being addressed.',
      'HR / Policy Query': 'Your HR/policy query has been resolved.',
      'Other': 'Your support request has been approved.'
    };

    await Notification.create({
      admin: req.user._id,
      staff: supportRequest.staff,
      recipientType: 'staff',
      type: 'OTHER',
      referenceId: supportRequest._id,
      message: approvalMessages[supportRequest.requestType] || 'Your support request has been approved.'
    });

    res.json({ success: true, message: 'Support request approved.' });
  } catch (err) {
    console.error('Approve support request error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve support request' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/support/admin/:id/reject — Reject support request
// ─────────────────────────────────────────────────────────────
router.put('/admin/:id/reject', authAdmin, async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findOne({
      _id: req.params.id,
      admin: req.user._id
    });

    if (!supportRequest) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    if (supportRequest.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const { adminNote } = req.body;
    supportRequest.status = 'Rejected';
    if (adminNote) supportRequest.adminNote = adminNote;
    await supportRequest.save();

    // Notify staff
    await Notification.create({
      admin: req.user._id,
      staff: supportRequest.staff,
      recipientType: 'staff',
      type: 'OTHER',
      referenceId: supportRequest._id,
      message: `Your support request has been rejected.${adminNote ? ' Note: ' + adminNote : ''}`
    });

    res.json({ success: true, message: 'Support request rejected.' });
  } catch (err) {
    console.error('Reject support request error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject support request' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const { authStaff } = require('./staffPortal');
const { auth: authAdmin } = require('./auth');
const { authCombined } = require('../utils/authMiddleware');
const { logActivity } = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// STAFF ENDPOINTS
// ─────────────────────────────────────────────────────────────

// POST /api/leaves/apply — Staff applies for leave
router.post('/apply', authStaff, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    // Validate balance if needed (optional: could allow applying but admin sees over-quota)
    // For now, let's just create the request.
    
    const leave = new LeaveRequest({
      staff: req.staff._id,
      admin: req.staff.user._id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'Pending'
    });
    
    await leave.save();
    
    // Create Notification for Admin
    const notification = new Notification({
      admin: req.staff.user._id,
      staff: req.staff._id,
      type: 'LEAVE_REQUEST',
      referenceId: leave._id,
      message: `${req.staff.fullName} has applied for ${type} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`
    });
    await notification.save();
    
    res.status(201).json({ success: true, message: 'Leave request submitted successfully', leave });
  } catch (err) {
    console.error('Leave apply error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

// GET /api/leaves/my-requests — Staff views their requests
router.get('/my-requests', authStaff, async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ staff: req.staff._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// GET /api/leaves/policy — Staff fetches their company's leave policy
router.get('/policy', authStaff, async (req, res) => {
  try {
    const LeavePolicy = require('../models/LeavePolicy');
    const policy = await LeavePolicy.findOne({ user: req.staff.user }).lean();
    if (!policy) {
      return res.json({
        success: true,
        data: {
          casualLeave: { daysPerYear: 12 },
          sickLeave: { daysPerYear: 12 },
        }
      });
    }
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('Fetch staff leave policy error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leave policy' });
  }
});

// GET /api/leaves/notifications — Staff views their notifications
router.get('/notifications', authStaff, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      staff: req.staff._id, 
      recipientType: 'staff',
      isArchived: false 
    })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// POST /api/leaves/mark-as-read — Mark all staff notifications as read
router.post('/mark-as-read', authStaff, async (req, res) => {
  try {
    await Notification.updateMany(
      { staff: req.staff._id, recipientType: 'staff', isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/leaves/admin/pending — Admin views pending requests
router.get('/admin/pending', authAdmin, async (req, res) => {
  try {
    const { staffId, status } = req.query;
    let query = { admin: req.user._id };
    
    if (staffId) query.staff = staffId;
    if (status) {
      query.status = status;
    } else if (!staffId) {
      // If no staffId, default to only pending for the global dashboard
      query.status = 'Pending';
    }
    // If staffId is provided but no status, we return ALL leaves for that staff member
    
    const requests = await LeaveRequest.find(query)
      .populate('staff', 'fullName employeeId leaveBalance documents.profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Fetch pending leaves error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// POST /api/leaves/admin/respond — Admin Approves/Rejects
router.post('/admin/respond', authAdmin, async (req, res) => {
  try {
    const { id, status, adminNotes } = req.body; // status: 'Approved' or 'Rejected'
    
    const leave = await LeaveRequest.findOne({ _id: id, admin: req.user._id });
    if (!leave) return res.status(404).json({ success: false, message: 'Request not found' });
    
    leave.status = status;
    leave.adminNotes = adminNotes;
    await leave.save();
    
    // If approved, deduct from balance if applicable
    if (status === 'Approved') {
      const staff = await Staff.findById(leave.staff);
      const days = Math.ceil((leave.endDate - leave.startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      if (leave.type === 'Casual') {
        staff.leaveBalance.casual -= days;
      } else if (leave.type === 'Sick') {
        staff.leaveBalance.sick -= days;
      }
      // Custom leave doesn't necessarily deduct from standard quota but could be tracked elsewhere
      
      await staff.save();
    }

    // Mark related notifications as read
    await Notification.updateMany({ referenceId: leave._id, recipientType: 'admin' }, { $set: { isRead: true } });
    
    // Create Notification for Staff
    const staffNotification = new Notification({
      admin: req.user._id,
      staff: leave.staff,
      recipientType: 'staff',
      type: 'LEAVE_REQUEST',
      referenceId: leave._id,
      message: `Your leave request for ${leave.type} (${new Date(leave.startDate).toLocaleDateString()}) has been ${status.toUpperCase()}. ${adminNotes ? 'Note: ' + adminNotes : ''}`
    });
    await staffNotification.save();

    await logActivity(req.user._id, 'LEAVE_RESPONSE', `Responded ${status} to ${leave.type} leave for staff ${leave.staff}`, { leaveId: leave._id });
    
    res.json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (err) {
    console.error('Leave respond error:', err);
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// GET /api/leaves/admin/notifications — Fetch admin notifications
router.get('/admin/notifications', authAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      admin: req.user._id, 
      recipientType: 'admin',
      isArchived: false 
    })
      .populate('staff', 'fullName employeeId documents.profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/leaves/notifications/:id/read — Mark individual notification as read
router.put('/notifications/:id/read', authCombined, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.userType === 'staff') query.staff = req.staff._id;
    else query.admin = req.user._id;

    await Notification.findOneAndUpdate(query, { isRead: true });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// PUT /api/leaves/notifications/:id/archive — Archive individual notification
router.put('/notifications/:id/archive', authCombined, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.userType === 'staff') query.staff = req.staff._id;
    else query.admin = req.user._id;

    await Notification.findOneAndUpdate(query, { isArchived: true, isRead: true });
    res.json({ success: true, message: 'Archived' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// POST /api/leaves/mark-as-read — Mark all staff notifications as read
router.post('/mark-as-read', authStaff, async (req, res) => {
  try {
    await Notification.updateMany(
      { staff: req.staff._id, recipientType: 'staff', isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// POST /api/leaves/admin/mark-as-read — Mark all admin notifications as read
router.post('/admin/mark-as-read', authAdmin, async (req, res) => {
  try {
    await Notification.updateMany(
      { admin: req.user._id, recipientType: 'admin', isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth: authAdmin } = require('./auth');
const { authStaff } = require('./staffPortal');
const { authCombined } = require('../utils/authMiddleware');

// GET /api/notifications/admin — All admin notifications
router.get('/admin', authAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({
      admin: req.user._id,
      recipientType: 'admin',
      isArchived: false
    })
      .populate('staff', 'fullName employeeId')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/staff — All staff notifications
router.get('/staff', authStaff, async (req, res) => {
  try {
    const notifications = await Notification.find({
      staff: req.staff._id,
      recipientType: 'staff',
      isArchived: false
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read — Mark single notification as read
router.put('/:id/read', authCombined, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.userType === 'staff') query.staff = req.staff._id;
    else query.admin = req.user._id;
    await Notification.findOneAndUpdate(query, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// PUT /api/notifications/:id/archive — Archive single notification
router.put('/:id/archive', authCombined, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.userType === 'staff') query.staff = req.staff._id;
    else query.admin = req.user._id;
    await Notification.findOneAndUpdate(query, { isArchived: true, isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// POST /api/notifications/admin/mark-all-read
router.post('/admin/mark-all-read', authAdmin, async (req, res) => {
  try {
    await Notification.updateMany(
      { admin: req.user._id, recipientType: 'admin', isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

// POST /api/notifications/staff/mark-all-read
router.post('/staff/mark-all-read', authStaff, async (req, res) => {
  try {
    await Notification.updateMany(
      { staff: req.staff._id, recipientType: 'staff', isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

module.exports = router;

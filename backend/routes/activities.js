const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { auth: protect } = require('./auth');

// GET /api/activities — List all workspace activities
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await ActivityLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    const total = await ActivityLog.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
});

const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activities/kpi-summary  — FAST: counters only, no array data
// Uses countDocuments exclusively so Atlas can answer from index stats (<100ms).
// The frontend calls this FIRST to render KPI stat cards immediately.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/kpi-summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [
      totalStaff,
      activeCount,
      todayPunchinsCount,
      pendingLeavesCount,
      approvedLeavesTodayCount,
      recentAnnouncements,
    ] = await Promise.all([
      Staff.countDocuments({ user: userId }),
      Attendance.countDocuments({ admin: userId, date: { $gte: todayStart }, punchOut: null }),
      Attendance.countDocuments({ admin: userId, date: { $gte: todayStart } }),
      LeaveRequest.countDocuments({ admin: userId, status: 'Pending' }),
      LeaveRequest.countDocuments({
        admin: userId,
        status: 'Approved',
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      Announcement.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title message priority isActive createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      totalStaff,
      activeCount,
      todayPunchinsCount,
      pendingLeavesCount,
      approvedLeavesTodayCount,
      recentAnnouncements,
    });
  } catch (err) {
    console.error('KPI summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch KPI summary' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activities/dashboard-summary — Full detail data (lists + monthly)
// Supports ?lite=1 to skip heavy monthly attendance aggregation.
// Called AFTER kpi-summary so the page already feels interactive.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard-summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const lite = req.query.lite === '1';

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
    const prevMonthEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Core detail queries — always run
    const coreQueries = [
      Staff.find({ user: userId }).select('fullName employeeId email documents.profileImage').lean(),
      Attendance.countDocuments({ admin: userId, date: { $gte: todayStart }, punchOut: null }),
      Attendance.find({ admin: userId, date: { $gte: todayStart } })
        .populate('staff', 'fullName email documents.profileImage')
        .select('staff punchIn punchOut sessions totalHours status workStatus')
        .lean(),
      LeaveRequest.find({ admin: userId, status: 'Approved', startDate: { $lte: now }, endDate: { $gte: now } })
        .populate('staff', 'fullName email')
        .lean(),
      LeaveRequest.find({ admin: userId, status: 'Pending' })
        .populate('staff', 'fullName email')
        .lean(),
      Announcement.find({ user: userId }).sort({ createdAt: -1 }).limit(3).lean(),
    ];

    // Monthly queries — skip when ?lite=1 (called again separately)
    const monthlyQueries = lite
      ? [Promise.resolve([]), Promise.resolve([])]
      : [
          Attendance.find({ admin: userId, date: { $gte: currentMonthStart, $lte: currentMonthEnd } })
            .select('date punchIn punchOut totalHours workStatus staff')
            .populate('staff', '_id')
            .lean(),
          Attendance.find({ admin: userId, date: { $gte: prevMonthStart, $lte: prevMonthEnd } })
            .select('date punchIn punchOut totalHours workStatus staff')
            .populate('staff', '_id')
            .lean(),
        ];

    const [
      staff, activeCount, todayPunchins, approvedLeaves, pendingLeaves, announcements,
      currentMonthly, prevMonthly,
    ] = await Promise.all([...coreQueries, ...monthlyQueries]);

    res.json({
      success: true,
      staff,
      activeCount,
      todayPunchins,
      approvedLeaves,
      pendingLeaves,
      announcements,
      currentMonthly,
      prevMonthly,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;

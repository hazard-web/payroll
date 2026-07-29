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

// GET /api/activities/dashboard-summary — Get unified dashboard summary
router.get('/dashboard-summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    
    // Parse current month and previous month values
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const prevDate = new Date(year, now.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const currentMonthStart = new Date(year, now.getMonth(), 1);
    const currentMonthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const prevMonthStart = new Date(prevYear, prevDate.getMonth(), 1);
    const prevMonthEnd = new Date(prevYear, prevDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      staff,
      activeCount,
      todayPunchins,
      approvedLeaves,
      pendingLeaves,
      announcements,
      currentMonthly,
      prevMonthly
    ] = await Promise.all([
      Staff.find({ user: userId }).select('fullName employeeId email documents.profileImage').lean(),
      Attendance.countDocuments({
        admin: userId,
        date: { $gte: new Date().setHours(0,0,0,0) },
        punchOut: null
      }),
      Attendance.find({
        admin: userId,
        date: { $gte: new Date().setHours(0,0,0,0) }
      }).populate('staff', 'fullName email').lean(),
      LeaveRequest.find({
        admin: userId,
        status: 'Approved',
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).populate('staff', 'fullName email').lean(),
      LeaveRequest.find({
        admin: userId,
        status: 'Pending'
      }).populate('staff', 'fullName email').lean(),
      Announcement.find({ user: userId }).sort({ createdAt: -1 }).limit(3).lean(),
      Attendance.find({
        admin: userId,
        date: { $gte: currentMonthStart, $lte: currentMonthEnd }
      }).select('date punchIn punchOut totalHours workStatus staff').populate('staff', '_id').lean(),
      Attendance.find({
        admin: userId,
        date: { $gte: prevMonthStart, $lte: prevMonthEnd }
      }).select('date punchIn punchOut totalHours workStatus staff').populate('staff', '_id').lean()
    ]);

    res.json({
      success: true,
      staff,
      activeCount,
      todayPunchins,
      approvedLeaves,
      pendingLeaves,
      announcements,
      currentMonthly,
      prevMonthly
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;

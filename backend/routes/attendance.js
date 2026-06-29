const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { authStaff } = require('./staffPortal');
const { auth: authAdmin } = require('./auth');
const { logActivity } = require('../utils/logger');
const { sendPunchOutReminderEmail } = require('../utils/emailService');

// Returns the effective working days for a staff member (own override or admin default)
const getEffectiveWorkDays = (staff) => {
  if (staff.workingDays && staff.workingDays.length > 0) return staff.workingDays;
  return staff.user?.defaultWorkDays || [1, 2, 3, 4, 5];
};

// Helper to get start of day in UTC for querying
const getStartOfDay = (dateString = null) => {
  const date = dateString ? new Date(dateString) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const formatDuration = (start, end = new Date()) => {
  const diffMs = Math.max(0, new Date(end) - new Date(start));
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// ─────────────────────────────────────────────────────────────
// STAFF ENDPOINTS (Using authStaff middleware)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (Using authAdmin middleware)
// ─────────────────────────────────────────────────────────────

// GET /api/attendance/admin/active — Count of staff currently punched in today
router.get('/admin/active', authAdmin, async (req, res) => {
  try {
    const today = getStartOfDay();
    const activeCount = await Attendance.countDocuments({
      admin: req.user._id,
      date: today,
      punchOut: null
    });

    res.json({ success: true, activeCount });
  } catch (err) {
    console.error('Active staff count error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active staff count' });
  }
});

// GET /api/attendance/admin/monthly?month=&year= — All records for a month across all staff
router.get('/admin/monthly', authAdmin, async (req, res) => {
  try {
    const m = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate   = new Date(Date.UTC(y, m, 1));

    const records = await Attendance.find({
      admin: req.user._id,
      date: { $gte: startDate, $lt: endDate }
    })
      .populate('staff', 'fullName employeeId designation department')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Monthly attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly attendance' });
  }
});

// GET /api/attendance/admin/daily?date=YYYY-MM-DD — Records for a specific date across all staff
router.get('/admin/daily', authAdmin, async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(targetDate.getUTCDate() + 1);

    const records = await Attendance.find({
      admin: req.user._id,
      date: { $gte: targetDate, $lt: nextDate }
    })
      .populate('staff', 'fullName employeeId designation department')
      .sort({ punchIn: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Daily attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily attendance' });
  }
});

// GET /api/attendance/admin/today-punchins — All today's punch-in records with staff details
router.get('/admin/today-punchins', authAdmin, async (req, res) => {
  try {
    const today = getStartOfDay();
    const records = await Attendance.find({
      admin: req.user._id,
      date: today
    })
      .populate('staff', 'fullName employeeId designation department')
      .sort({ punchIn: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Today punch-ins error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch today\'s punch-ins' });
  }
});

// GET /api/attendance/admin/performance?date=YYYY-MM-DD — Today's team task performance
router.get('/admin/performance', authAdmin, async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(targetDate.getUTCDate() + 1);

    const records = await Attendance.find({
      admin: req.user._id,
      date: { $gte: targetDate, $lt: nextDate }
    })
      .populate('staff', 'fullName employeeId designation department')
      .sort({ punchIn: -1 })
      .lean();

    const data = records.map((record) => {
      const tasks = Array.isArray(record.tasks) ? record.tasks : [];
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const inProgress = tasks.filter(t => t.status === 'In Progress').length;
      const pending = tasks.filter(t => t.status === 'Pending').length;
      const total = tasks.length;
      return {
        ...record,
        taskStats: {
          total,
          completed,
          inProgress,
          pending,
          completionRate: total ? parseFloat(((completed / total) * 100).toFixed(0)) : 0
        }
      };
    });

    const totalTasks = data.reduce((sum, record) => sum + record.taskStats.total, 0);
    const completedTasks = data.reduce((sum, record) => sum + record.taskStats.completed, 0);
    const inProgressTasks = data.reduce((sum, record) => sum + record.taskStats.inProgress, 0);
    const pendingTasks = data.reduce((sum, record) => sum + record.taskStats.pending, 0);

    res.json({
      success: true,
      data,
      summary: {
        date: targetDate.toISOString(),
        presentCount: data.length,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate: totalTasks ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(0)) : 0
      }
    });
  } catch (err) {
    console.error('Team performance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch team performance' });
  }
});

// POST /api/attendance/punch-in
router.post('/punch-in', authStaff, async (req, res) => {
  try {
    const { lat, lng, tasks } = req.body;
    const today = getStartOfDay();
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun … 6=Sat

    const effectiveWorkDays = getEffectiveWorkDays(req.staff);
    if (!effectiveWorkDays.includes(dayOfWeek)) {
      return res.status(403).json({
        success: false,
        message: 'Today is not a working day for you. Please contact your administrator.'
      });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one task before Punch In.' });
    }

    const normalizedTasks = tasks.map(task => ({
      project: (task.project || '').trim(),
      description: (task.description || '').trim(),
      status: 'Pending',
      notes: (task.notes || '').trim()
    }));

    if (normalizedTasks.some(task => !task.project)) {
      return res.status(400).json({ success: false, message: 'Please select a project.' });
    }
    if (normalizedTasks.some(task => !task.description)) {
      return res.status(400).json({ success: false, message: 'Please add at least one task before Punch In.' });
    }

    let attendance = await Attendance.findOne({ staff: req.staff._id, date: today });
    if (attendance) {
      return res.status(400).json({ success: false, message: 'Already punched in for today' });
    }

    // Work criteria: If punch in after 11:00 AM, mark as Half Day
    // Local time check
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let initialWorkStatus = 'Full Day';

    if (currentHour > 11 || (currentHour === 11 && currentMinute > 0)) {
      initialWorkStatus = 'Half Day';
    }

    // Defensive: a staff without a populated `user` shouldn't crash the route.
    // `admin` is required by the schema, so fall back to the staff's own _id
    // (still a valid ObjectId, just not strictly the admin user — better than 500).
    const adminId = (req.staff.user && req.staff.user._id) ? req.staff.user._id : req.staff._id;

    attendance = new Attendance({
      staff: req.staff._id,
      admin: adminId,
      date: today,
      punchIn: now,
      status: 'incomplete',
      workStatus: initialWorkStatus,
      locationIn: lat && lng ? { lat, lng } : undefined,
      tasks: normalizedTasks
    });

    try {
      await attendance.save();
    } catch (saveErr) {
      // Handle the unique-index race: two concurrent punch-in requests
      // both pass the findOne check, then both try to save. The second
      // save hits the unique index and throws E11000.
      if (saveErr && saveErr.code === 11000) {
        return res.status(400).json({ success: false, message: 'Already punched in for today' });
      }
      throw saveErr;
    }
    res.json({ success: true, message: `Punched in successfully. Status: ${initialWorkStatus}`, attendance });
  } catch (err) {
    console.error('Punch in error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to punch in' });
  }
});

// POST /api/attendance/punch-out
router.post('/punch-out', authStaff, async (req, res) => {
  try {
    const { lat, lng, tasks } = req.body;
    const today = getStartOfDay();
    const now = new Date();
    const dayOfWeek = now.getUTCDay();

    const effectiveWorkDays = getEffectiveWorkDays(req.staff);
    if (!effectiveWorkDays.includes(dayOfWeek)) {
      return res.status(403).json({
        success: false,
        message: 'Today is not a working day for you. Please contact your administrator.'
      });
    }

    const attendance = await Attendance.findOne({ staff: req.staff._id, date: today });
    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No punch-in record found for today' });
    }
    if (attendance.punchOut) {
      return res.status(400).json({ success: false, message: 'Already punched out for today' });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one task before Punch In.' });
    }

    const normalizedTasks = tasks.map(task => ({
      project: (task.project || '').trim(),
      description: (task.description || '').trim(),
      status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
      notes: (task.notes || '').trim()
    }));

    if (normalizedTasks.some(task => !task.project)) {
      return res.status(400).json({ success: false, message: 'Please select a project.' });
    }
    if (normalizedTasks.some(task => !task.description)) {
      return res.status(400).json({ success: false, message: 'Please add at least one task before Punch In.' });
    }

    attendance.tasks = normalizedTasks;

    attendance.punchOut = now;
    attendance.locationOut = lat && lng ? { lat, lng } : undefined;
    
    const durationMs = attendance.punchOut - attendance.punchIn;
    const durationHours = durationMs / (1000 * 60 * 60);
    attendance.totalHours = parseFloat(durationHours.toFixed(2));

    // Refined Work Criteria Logic
    // Absent/LOP: < 4 hours
    // Half Day: 4 to 7.9 hours
    // Full Day: 8.5+ hours
    // Overtime: Full Day + extra working (max 1h)

    let finalWorkStatus = attendance.workStatus; // Start with what was set at punch-in (Full Day or Half Day)

    if (attendance.totalHours < 4) {
      finalWorkStatus = 'LOP';
    } else if (attendance.totalHours >= 4 && attendance.totalHours < 8.0) {
      finalWorkStatus = 'Half Day';
    } else if (attendance.totalHours >= 8.5) {
      // If they punched in before 11:00 AM, they stay Full Day.
      // If they punched in after 11:00 AM, they stay Half Day (already set at punch-in).
      if (attendance.workStatus === 'Full Day') {
        finalWorkStatus = 'Full Day';
      }
    } else {
      // 8.0 to 8.4 range - default to Half Day or maintain Half Day
      finalWorkStatus = 'Half Day';
    }

    attendance.workStatus = finalWorkStatus;

    // Overtime Calculation: starts after 8.5h, max 1h (9.5h total cap)
    if (attendance.totalHours > 8.5) {
      let ot = attendance.totalHours - 8.5;
      attendance.overtimeHours = parseFloat(Math.min(ot, 1.0).toFixed(2));
    } else {
      attendance.overtimeHours = 0;
    }

    attendance.status = attendance.totalHours > 9.5 ? 'flagged' : 'complete';
    if (attendance.totalHours > 9.5) {
      attendance.notes = `System: Shift duration (${attendance.totalHours}h) exceeds the 9.5h limit (Full Day + 1h OT). Flagged for review.`;
    }

    const taskTotal = Array.isArray(attendance.tasks) ? attendance.tasks.length : 0;
    const completedTasks = Array.isArray(attendance.tasks)
      ? attendance.tasks.filter(t => t.status === 'Completed').length
      : 0;
    const taskCompletionRate = taskTotal ? parseFloat(((completedTasks / taskTotal) * 100).toFixed(0)) : 0;

    await attendance.save();
    // logActivity is fire-and-forget — don't let it fail the response.
    try {
      const activityActor = (req.staff.user && req.staff.user._id) ? req.staff.user._id : req.staff._id;
      await logActivity(activityActor, 'PUNCH_OUT', `Punched out for ${req.staff.fullName} (Status: ${finalWorkStatus})`, { attendanceId: attendance._id });
    } catch (logErr) {
      console.warn('logActivity (punch-out) failed:', logErr.message);
    }
    res.json({
      success: true,
      message: 'Punched out successfully',
      attendance,
      taskSummary: { totalTasks: taskTotal, completedTasks, taskCompletionRate }
    });
  } catch (err) {
    console.error('Punch out error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to punch out' });
  }
});

// GET /api/attendance/today
router.get('/today', authStaff, async (req, res) => {
  try {
    const today = getStartOfDay();
    const attendance = await Attendance.findOne({
      staff: req.staff._id,
      date: today
    }).lean();

    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch record' });
  }
});

// GET /api/attendance/active — Returns today's open shift (punched in but not out)
router.get('/active', authStaff, async (req, res) => {
  try {
    const today = getStartOfDay();
    const attendance = await Attendance.findOne({
      staff: req.staff._id,
      date: today,
      punchOut: null // Only return if not punched out yet
    }).lean();
    res.json({ success: true, activeShift: attendance || null });
  } catch (err) {
    console.error('Active shift error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active shift' });
  }
});

// GET /api/attendance/history (Staff View) — supports ?month=&year= or defaults to last 30 days
router.get('/history', authStaff, async (req, res) => {
  try {
    let filter = { staff: req.staff._id };

    const { month, year } = req.query;
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const endDate = new Date(Date.UTC(y, m, 1)); // First day of next month
      filter.date = { $gte: startDate, $lt: endDate };
    } else {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 30);
      filter.date = { $gte: limitDate };
    }

    // .lean() is already applied. Projection keeps the list payload small:
    // we don't need locationIn/Out coords, admin ref, or timestamps for the
    // monthly view. Tasks are needed for the "completed/total" column.
    const history = await Attendance.find(filter)
      .sort({ date: -1 })
      .lean()
      .select('date punchIn punchOut totalHours overtimeHours status workStatus tasks notes');

    // Compute hours per record: use the persisted totalHours when available
    // (closed shifts), or compute live hours from (now - punchIn) for the
    // currently-open shift so the dashboard reflects real time.
    const nowMs = Date.now();
    const recordsWithLiveHours = history.map(record => {
      if (record.punchIn && !record.punchOut) {
        const liveHours = parseFloat(((nowMs - new Date(record.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(2));
        return { ...record, totalHours: liveHours, workStatus: record.workStatus || 'Active' };
      }
      return record;
    });

    // Map history to handle real-time "ACTIVE" status
    const mappedHistory = recordsWithLiveHours.map(record => {
      if (!record.punchOut) {
        return { ...record, workStatus: 'Active' };
      }
      return record;
    });

    // Calculate summary stats for this period. Include any record where the
    // employee punched in (regardless of whether they punched out) in the
    // present-day count, so the dashboard doesn't show 0 while a shift is open.
    const presentDays = recordsWithLiveHours.filter(r => !!r.punchIn).length;
    const totalHours = recordsWithLiveHours.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const totalOT = recordsWithLiveHours.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const flaggedCount = recordsWithLiveHours.filter(r => r.status === 'flagged').length;
    const totalTasks = recordsWithLiveHours.reduce((sum, r) => sum + ((Array.isArray(r.tasks) ? r.tasks.length : 0)), 0);
    const completedTasks = recordsWithLiveHours.reduce((sum, r) => sum + ((Array.isArray(r.tasks) ? r.tasks.filter(t => t.status === 'Completed').length : 0)), 0);
    const avgHours = presentDays > 0 ? totalHours / presentDays : 0;
    const taskCompletionRate = totalTasks ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(0)) : 0;

    res.json({
      success: true,
      history: mappedHistory,
      summary: {
        presentDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        avgHours: parseFloat(avgHours.toFixed(2)),
        totalOT: parseFloat(totalOT.toFixed(2)),
        flaggedCount,
        totalTasks,
        completedTasks,
        taskCompletionRate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// GET /api/attendance/weekly?date= — Weekly summary for a specific week
router.get('/weekly', authStaff, async (req, res) => {
  try {
    const refDate = req.query.date ? new Date(req.query.date) : new Date();
    const day = refDate.getUTCDay() || 7; // Mon=1...Sun=7
    const monday = new Date(refDate);
    monday.setUTCDate(refDate.getUTCDate() - day + 1);
    monday.setUTCHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 7);

    const weekRecords = await Attendance.find({
      staff: req.staff._id,
      date: { $gte: monday, $lt: sunday }
    });

    // Include any record where the employee punched in (regardless of whether
    // they punched out) so weekly stats don't show 0 for an open shift.
    const nowMs = Date.now();
    const weekHoursAdjusted = weekRecords.map(r => {
      if (r.punchIn && !r.punchOut) {
        const liveHours = parseFloat(((nowMs - new Date(r.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(2));
        return { ...r.toObject(), totalHours: liveHours };
      }
      return r;
    });

    const totalHours = weekHoursAdjusted.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const totalOT = weekHoursAdjusted.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const presentDays = weekHoursAdjusted.filter(r => !!r.punchIn).length;
    const flaggedCount = weekHoursAdjusted.filter(r => r.status === 'flagged').length;
    const totalTasks = weekHoursAdjusted.reduce((sum, r) => sum + ((Array.isArray(r.tasks) ? r.tasks.length : 0)), 0);
    const completedTasks = weekHoursAdjusted.reduce((sum, r) => sum + ((Array.isArray(r.tasks) ? r.tasks.filter(t => t.status === 'Completed').length : 0)), 0);
    const avgHours = presentDays > 0 ? totalHours / presentDays : 0;
    const taskCompletionRate = totalTasks ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(0)) : 0;

    res.json({
      success: true,
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalOT: parseFloat(totalOT.toFixed(2)),
        presentDays,
        flaggedCount,
        avgHours: parseFloat(avgHours.toFixed(2)),
        totalTasks,
        completedTasks,
        taskCompletionRate,
        weekStart: monday.toISOString(),
      }
    });
  } catch (err) {
    console.error('Weekly summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly summary' });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (Using authAdmin middleware)
// ─────────────────────────────────────────────────────────────

// GET /api/attendance/admin/staff/:staffId
router.get('/admin/staff/:staffId', authAdmin, async (req, res) => {
  try {
    const history = await Attendance.find({
      staff: req.params.staffId,
      admin: req.user._id
    }).sort({ date: -1 });

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff attendance' });
  }
});

// PUT /api/attendance/admin/:id
router.put('/admin/:id', authAdmin, async (req, res) => {
  try {
    const { punchIn, punchOut, notes, status } = req.body;
    
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      admin: req.user._id
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (punchIn) attendance.punchIn = new Date(punchIn);
    if (punchOut) attendance.punchOut = new Date(punchOut);
    
    if (attendance.punchIn && attendance.punchOut) {
      const durationMs = attendance.punchOut - attendance.punchIn;
      attendance.totalHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
      
      if (attendance.totalHours > 8.5) {
        let ot = attendance.totalHours - 8.5;
        attendance.overtimeHours = parseFloat(Math.min(ot, 1.0).toFixed(2));
      } else {
        attendance.overtimeHours = 0;
      }
    }

    if (notes !== undefined) attendance.notes = notes;
    if (status) attendance.status = status;

    await attendance.save();

    res.json({ success: true, message: 'Record updated', attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update record' });
  }
});

// ─── Working Days Management ──────────────────────────────────────────────────

// GET /api/attendance/admin/working-days — Admin default + all staff overrides
router.get('/admin/working-days', authAdmin, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user._id).select('defaultWorkDays').lean();
    const staffList = await Staff.find({ user: req.user._id })
      .select('fullName employeeId designation workingDays clientAssignment')
      .sort({ fullName: 1 })
      .lean();
    res.json({ success: true, defaultWorkDays: adminUser.defaultWorkDays || [1,2,3,4,5], staff: staffList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch working days' });
  }
});

// PUT /api/attendance/admin/working-days/default — Update company-wide default working days
router.put('/admin/working-days/default', authAdmin, async (req, res) => {
  try {
    const { workDays } = req.body; // e.g. [1,2,3,4,5]
    if (!Array.isArray(workDays) || workDays.some(d => typeof d !== 'number' || d < 0 || d > 6)) {
      return res.status(400).json({ success: false, message: 'workDays must be an array of integers 0–6' });
    }
    await User.findByIdAndUpdate(req.user._id, { defaultWorkDays: workDays });
    res.json({ success: true, message: 'Default working days updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update default working days' });
  }
});

// PUT /api/attendance/admin/working-days/staff/:staffId — Update a staff member's working days override
router.put('/admin/working-days/staff/:staffId', authAdmin, async (req, res) => {
  try {
    const { workDays, clientAssignment } = req.body;
    if (!Array.isArray(workDays) || workDays.some(d => typeof d !== 'number' || d < 0 || d > 6)) {
      return res.status(400).json({ success: false, message: 'workDays must be an array of integers 0–6' });
    }
    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    staff.workingDays = workDays;
    staff.clientAssignment = clientAssignment || '';
    await staff.save();
    res.json({ success: true, message: 'Staff working days updated', staff });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update staff working days' });
  }
});

// GET /api/attendance/admin/pending — Get all flagged or long-incomplete records for dashboard
router.get('/admin/pending', authAdmin, async (req, res) => {
  try {
    const pending = await Attendance.find({
      admin: req.user._id,
      $or: [
        { status: 'flagged' },
        { status: 'incomplete', date: { $lt: getStartOfDay() } } // Incomplete from previous days
      ]
    }).populate('staff', 'fullName employeeId').sort({ date: -1 });

    res.json({ success: true, data: pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/admin/force-punch-out — Close all "incomplete" shifts from previous days
router.get('/admin/export-csv', authAdmin, async (req, res) => {
  try {
    const records = await Attendance.find({ admin: req.user._id })
      .populate('staff', 'fullName employeeId')
      .sort({ date: -1 });

    let csv = 'Employee,ID,Date,Punch In,Punch Out,Total Hours,Overtime,Status\n';
    records.forEach(r => {
      const date = new Date(r.date).toLocaleDateString('en-GB'); // DD/MM/YYYY
      const formatTime = (dt) => {
        if (!dt) return 'N/A';
        const d = new Date(dt);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/,/g, '');
      };
      const punchIn = formatTime(r.punchIn);
      const punchOut = formatTime(r.punchOut);
      csv += `"${r.staff?.fullName || 'N/A'}","${r.staff?.employeeId || 'N/A'}","${date}","${punchIn}","${punchOut}",${r.totalHours || 0},${r.overtimeHours || 0},"${r.status}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`Attendance_Export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// POST /api/attendance/admin/force-punch-out — Close all "incomplete" shifts from previous days
router.post('/admin/force-punch-out', authAdmin, async (req, res) => {
  try {
    const today = getStartOfDay();
    const staleShifts = await Attendance.find({ admin: req.user._id, status: 'incomplete', date: { $lt: today } });
    
    let modifiedCount = 0;
    for (const shift of staleShifts) {
      if (shift.punchIn) {
        // Set punch out to 9.5 hours after punch in (Full Day + 1h OT cap)
        shift.punchOut = new Date(shift.punchIn.getTime() + 9.5 * 60 * 60 * 1000);
        shift.totalHours = 9.5;
        shift.overtimeHours = 1.0;
        shift.workStatus = 'Full Day';
      }
      shift.status = 'flagged';
      shift.notes = (shift.notes ? shift.notes + ' | ' : '') + 'System: Force closed stale shift from previous day.';
      await shift.save();
      modifiedCount++;
    }

    if (modifiedCount > 0) {
      await logActivity(req.user._id, 'FORCE_PUNCH_OUT', `Bulk closed ${modifiedCount} stale attendance shifts.`);
    }

    res.json({ success: true, message: `Closed ${modifiedCount} stale shifts. They are now flagged for review.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CRON JOBS / BACKGROUND TASKS
// ─────────────────────────────────────────────────────────────
const {
  runShiftCheck,
  runOfficeClosingCheck,
  runOfficeClosingReminder,
  runOfficeClosingAutoClose
} = require('../utils/cronJobs');

// GET /api/attendance/cron/check-shifts  (called by Vercel Cron every hour)
router.get('/cron/check-shifts', async (req, res) => {
  try {
    const result = await runShiftCheck();
    res.json({ success: true, message: 'Cron executed successfully', ...result });
  } catch (err) {
    console.error('Cron job error:', err);
    res.status(500).json({ success: false, message: 'Cron job failed' });
  }
});

// GET /api/attendance/cron/office-closing  (call every 5 minutes from hosted cron)
router.get('/cron/office-closing', async (req, res) => {
  try {
    const result = await runOfficeClosingCheck();
    res.json({ success: true, message: 'Office closing cron executed successfully', ...result });
  } catch (err) {
    console.error('Office closing cron job error:', err);
    res.status(500).json({ success: false, message: 'Office closing cron job failed' });
  }
});

// GET /api/attendance/cron/office-closing-reminder  (7:00 PM IST / 13:30 UTC)
router.get('/cron/office-closing-reminder', async (req, res) => {
  try {
    const result = await runOfficeClosingReminder();
    res.json({ success: true, message: 'Office closing reminder cron executed successfully', ...result });
  } catch (err) {
    console.error('Office closing reminder cron job error:', err);
    res.status(500).json({ success: false, message: 'Office closing reminder cron job failed' });
  }
});

// GET /api/attendance/cron/office-closing-auto-close  (7:30 PM IST / 14:00 UTC)
router.get('/cron/office-closing-auto-close', async (req, res) => {
  try {
    const result = await runOfficeClosingAutoClose();
    res.json({ success: true, message: 'Office closing auto-close cron executed successfully', ...result });
  } catch (err) {
    console.error('Office closing auto-close cron job error:', err);
    res.status(500).json({ success: false, message: 'Office closing auto-close cron job failed' });
  }
});

module.exports = router;

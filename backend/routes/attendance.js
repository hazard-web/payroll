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
const {
  createAttendanceDocument,
  startAttendanceSession,
  closeAttendanceSession,
  buildAttendanceSnapshot,
  getDayStart,
  DEFAULT_STANDARD_HOURS,
} = require('../utils/attendanceService');

// Returns the effective working days for a staff member (own override or admin default)
const getEffectiveWorkDays = (staff) => {
  if (staff.workingDays && staff.workingDays.length > 0) return staff.workingDays;
  return staff.user?.defaultWorkDays || [1, 2, 3, 4, 5];
};

// Helper to get start of day in UTC for querying
const getStartOfDay = (dateString = null) => getDayStart(dateString);

const syncAttendanceRecord = (attendance, referenceTime = new Date()) => {
  if (!attendance) return null;
  const snapshot = buildAttendanceSnapshot(attendance, referenceTime);
  const latestClosed = Array.isArray(attendance.sessions)
    ? attendance.sessions.slice().reverse().find((session) => session && session.endTime)
    : null;
  const activeSession = snapshot.activeSession;

  attendance.punchIn = activeSession?.startTime || attendance.punchIn || attendance.sessions?.[0]?.startTime || null;
  attendance.punchOut = activeSession ? null : (latestClosed?.endTime || null);
  attendance.totalHours = parseFloat(snapshot.totalHours.toFixed(2));
  attendance.overtimeHours = Math.max(0, parseFloat((attendance.totalHours - DEFAULT_STANDARD_HOURS).toFixed(2)));
  attendance.workStatus = snapshot.workStatus;
  attendance.status = snapshot.status;
  attendance.sessionCount = snapshot.sessionCount;
  attendance.tasks = Array.isArray(attendance.sessions) && attendance.sessions.length > 0
    ? (activeSession?.tasks || latestClosed?.tasks || attendance.sessions[attendance.sessions.length - 1]?.tasks || [])
    : [];

  return snapshot;
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

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/admin/payroll-summary
// Returns a complete payroll breakdown for a staff member for a month.
// Query params: staffId, month (1-12), year
// ─────────────────────────────────────────────────────────────
router.get('/admin/payroll-summary', authAdmin, async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    if (!staffId || !month || !year) {
      return res.status(400).json({ success: false, message: 'staffId, month, and year are required' });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // ── 1. Working days: Mon–Fri in the month, minus company holidays ──────────
    const LeavePolicy = require('../models/LeavePolicy');
    const policy = await LeavePolicy.findOne({ user: req.user._id }).lean();
    const weekendDays = policy?.weekendDays ?? [0, 6]; // 0=Sun, 6=Sat
    const holidays = new Set((policy?.holidays || []).map(h => {
      const d = new Date(h);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }));

    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd   = new Date(Date.UTC(y, m, 0)); // last day of month (UTC)

    let workingDays = 0;
    const cur = new Date(monthStart);
    while (cur <= monthEnd) {
      const dow = cur.getUTCDay();
      const key = `${cur.getUTCFullYear()}-${cur.getUTCMonth()}-${cur.getUTCDate()}`;
      if (!weekendDays.includes(dow) && !holidays.has(key)) workingDays++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // ── 2. Attendance records: deduplicate by date, count present days ─────────
    const attRecords = await Attendance.find({
      admin: req.user._id,
      staff: staffId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean();

    // Deduplicate: one record per calendar date (take best status if duplicate)
    const byDate = {};
    for (const r of attRecords) {
      const dk = new Date(r.date).toISOString().split('T')[0];
      if (!byDate[dk] || r.status === 'complete') byDate[dk] = r;
    }
    const uniqueRecords = Object.values(byDate);

    // Count present = complete + flagged (flagged = completed but with notes)
    const presentDays = uniqueRecords.filter(r =>
      r.status === 'complete' || r.status === 'flagged'
    ).length;

    // ── 3. Leave records: fetch approved leaves overlapping this month ─────────
    const LeaveRequest = require('../models/LeaveRequest');
    const approvedLeaves = await LeaveRequest.find({
      admin: req.user._id,
      staff: staffId,
      status: 'Approved',
      startDate: { $lte: monthEnd },
      endDate:   { $gte: monthStart },
    }).lean();

    // Helper: count working days within a leave that fall in the month
    const countLeaveDays = (leave) => {
      const lStart = new Date(Math.max(new Date(leave.startDate), monthStart));
      const lEnd   = new Date(Math.min(new Date(leave.endDate),   monthEnd));
      let days = 0;
      const d = new Date(lStart);
      while (d <= lEnd) {
        const dow = d.getUTCDay();
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        if (!weekendDays.includes(dow) && !holidays.has(key)) days++;
        d.setUTCDate(d.getUTCDate() + 1);
      }
      return days;
    };

    // Casual + Sick = paid leave (isPaid from policy)
    // Custom = LWP (Leave Without Pay)
    let paidLeaveDays = 0;
    let lwpDays = 0;
    const leaveBreakdown = [];

    for (const leave of approvedLeaves) {
      const days = countLeaveDays(leave);
      const isPaid = leave.type === 'Casual' || leave.type === 'Sick';
      if (isPaid) {
        paidLeaveDays += days;
      } else {
        lwpDays += days;
      }
      leaveBreakdown.push({ type: leave.type, days, isPaid, startDate: leave.startDate, endDate: leave.endDate });
    }

    // ── 4. Calculate final paid days ─────────────────────────────────────────
    // Paid Days = present + paidLeave - LWP, capped to [0, workingDays]
    // Absent days = workingDays - present - paidLeave - lwp  (floor at 0)
    const rawPaidDays = presentDays + paidLeaveDays - lwpDays;
    const paidDays   = Math.min(workingDays, Math.max(0, rawPaidDays));
    const absentDays = Math.max(0, workingDays - presentDays - paidLeaveDays - lwpDays);

    res.json({
      success: true,
      summary: {
        workingDays,
        presentDays,
        paidLeaveDays,
        lwpDays,
        absentDays,
        paidDays,
        leaveBreakdown,
      }
    });
  } catch (err) {
    console.error('Payroll summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute payroll summary' });
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

// GET /api/attendance/admin/staff/:id/tasks — Task history for a specific staff member with filters
router.get('/admin/staff/:id/tasks', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { filter, startDate, endDate } = req.query;

    // Verify staff belongs to this admin
    const staff = await Staff.findOne({ _id: id, user: req.user._id });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Build date range based on filter
    let dateQuery = {};
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (filter === 'today') {
      dateQuery = { date: { $gte: today, $lt: new Date(today.getTime() + 86400000) } };
    } else if (filter === 'yesterday') {
      const yesterday = new Date(today.getTime() - 86400000);
      dateQuery = { date: { $gte: yesterday, $lt: today } };
    } else if (filter === 'week') {
      const weekStart = new Date(today);
      weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay());
      dateQuery = { date: { $gte: weekStart, $lt: new Date(today.getTime() + 86400000) } };
    } else if (filter === 'month') {
      const monthStart = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
      dateQuery = { date: { $gte: monthStart, $lt: new Date(today.getTime() + 86400000) } };
    } else if (filter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      dateQuery = { date: { $gte: start, $lte: end } };
    } else {
      // Default: show all records
      dateQuery = {};
    }

    // Find all attendance records for this staff member
    const records = await Attendance.find({
      staff: id,
      admin: req.user._id,
      ...dateQuery
    })
      .sort({ date: -1, punchIn: -1 })
      .lean();

    // Flatten tasks with parent info
    const allTasks = [];
    records.forEach(record => {
      if (Array.isArray(record.tasks)) {
        // Session status: "Closed" if punchOut exists, "Active" if still punched in
        const sessionStatus = record.punchOut ? 'Closed' : 'Active';
        record.tasks.forEach(task => {
          allTasks.push({
            ...task,
            attendanceId: record._id,
            taskDate: record.date,
            punchIn: record.punchIn,
            punchOut: record.punchOut,
            workStatus: record.workStatus,
            sessionStatus: sessionStatus
          });
        });
      }
    });

    // Calculate stats
    const totalTasks = allTasks.length;
    const pending = allTasks.filter(t => t.status === 'Pending').length;
    const inProgress = allTasks.filter(t => t.status === 'In Progress').length;
    const completed = allTasks.filter(t => t.status === 'Completed').length;

    res.json({
      success: true,
      data: {
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          employeeId: staff.employeeId,
          designation: staff.designation,
          department: staff.department
        },
        summary: {
          totalTasks,
          pending,
          inProgress,
          completed
        },
        tasks: allTasks
      }
    });
  } catch (err) {
    console.error('Staff task history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff task history' });
  }
});

// GET /api/attendance/admin/staff-list — Get all staff for Team Performance module
router.get('/admin/staff-list', authAdmin, async (req, res) => {
  try {
    const staff = await Staff.find({ user: req.user._id })
      .select('fullName employeeId designation department')
      .sort({ fullName: 1 })
      .lean();

    res.json({ success: true, data: staff });
  } catch (err) {
    console.error('Staff list error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff list' });
  }
});

// POST /api/attendance/punch-in
router.post('/punch-in', authStaff, async (req, res) => {
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

    const adminId = (req.staff.user && req.staff.user._id) ? req.staff.user._id : req.staff._id;

    let attendance = await Attendance.findOne({ staff: req.staff._id, date: today });
    if (!attendance) {
      attendance = new Attendance(createAttendanceDocument({ staffId: req.staff._id, adminId, date: today }));
      attendance.date = today;
      attendance.punchIn = now;
      attendance.locationIn = lat && lng ? { lat, lng } : undefined;
    } else {
      syncAttendanceRecord(attendance, now);
      const snapshot = buildAttendanceSnapshot(attendance, now);
      if (snapshot.activeSession) {
        return res.status(400).json({ success: false, message: 'An active attendance session already exists. Please punch out before starting a new session.' });
      }
      attendance.locationIn = lat && lng ? { lat, lng } : undefined;
    }

    const startResult = startAttendanceSession(attendance, { startTime: now, tasks });
    if (!startResult.success) {
      return res.status(400).json({ success: false, message: startResult.message });
    }

    syncAttendanceRecord(attendance, now);
    attendance.admin = adminId;
    attendance.date = today;
    attendance.punchIn = now;
    attendance.locationIn = lat && lng ? { lat, lng } : undefined;
    attendance.workStatus = 'Active';

    await attendance.save();

    try {
      const activityActor = (req.staff.user && req.staff.user._id) ? req.staff.user._id : req.staff._id;
      await logActivity(activityActor, 'PUNCH_IN', `Punched in for ${req.staff.fullName}`, { attendanceId: attendance._id });
    } catch (logErr) {
      console.warn('logActivity (punch-in) failed:', logErr.message);
    }

    res.json({ success: true, message: startResult.message, attendance });
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

    syncAttendanceRecord(attendance, now);
    const closeResult = closeAttendanceSession(attendance, {
      endTime: now,
      source: 'MANUAL',
      reason: 'Manual punch out'
    });

    if (!closeResult.success) {
      return res.status(400).json({ success: false, message: closeResult.message });
    }

    const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map(task => ({
      project: (task.project || '').trim(),
      description: (task.description || '').trim(),
      status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
      notes: (task.notes || '').trim()
    }));

    if (normalizedTasks.length > 0) {
      if (normalizedTasks.some(task => !task.project)) {
        return res.status(400).json({ success: false, message: 'Please select a project.' });
      }
      if (normalizedTasks.some(task => !task.description)) {
        return res.status(400).json({ success: false, message: 'Please add at least one task before Punch In.' });
      }
      attendance.tasks = normalizedTasks;
    }

    attendance.locationOut = lat && lng ? { lat, lng } : undefined;
    syncAttendanceRecord(attendance, now);

    const taskTotal = Array.isArray(attendance.tasks) ? attendance.tasks.length : 0;
    const completedTasks = Array.isArray(attendance.tasks)
      ? attendance.tasks.filter(t => t.status === 'Completed').length
      : 0;
    const taskCompletionRate = taskTotal ? parseFloat(((completedTasks / taskTotal) * 100).toFixed(0)) : 0;

    await attendance.save();
    try {
      const activityActor = (req.staff.user && req.staff.user._id) ? req.staff.user._id : req.staff._id;
      await logActivity(activityActor, 'PUNCH_OUT', `Punched out for ${req.staff.fullName}`, { attendanceId: attendance._id });
    } catch (logErr) {
      console.warn('logActivity (punch-out) failed:', logErr.message);
    }
    res.json({
      success: true,
      message: closeResult.message,
      attendance,
      taskSummary: { totalTasks: taskTotal, completedTasks, taskCompletionRate }
    });
  } catch (err) {
    console.error('Punch out error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to punch out' });
  }
});

// ─────────────────────────────────────────────────────────────
// TASK MANAGEMENT ENDPOINTS (Independent of Punch-In/Out)
// ─────────────────────────────────────────────────────────────

// Helper: calculate elapsed minutes from startedAt to now
const calcElapsedMinutes = (startedAt) => {
  if (!startedAt) return 0;
  return Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
};

// Helper: format duration as "1h 25m"
const formatDurationMinutes = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// GET /api/attendance/tasks/today — Get today's tasks for the authenticated staff
router.get('/tasks/today', authStaff, async (req, res) => {
  try {
    const today = getStartOfDay();
    // Also include tasks from all recent attendance records (for the tasks view)
    const { month, year } = req.query;
    let filter = { staff: req.staff._id };

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1)),
        $lt: new Date(Date.UTC(y, m, 1))
      };
    } else {
      // Default: today only
      filter.date = { $gte: today, $lt: new Date(today.getTime() + 86400000) };
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).lean();

    const nowMs = Date.now();
    const allTasks = [];
    records.forEach(record => {
      (record.tasks || []).forEach(task => {
        // Compute live elapsed if running
        let liveDurationMinutes = task.durationMinutes || 0;
        if (task.isRunning && task.startedAt) {
          const elapsed = Math.round((nowMs - new Date(task.startedAt).getTime()) / 60000);
          liveDurationMinutes = (task.durationMinutes || 0) + elapsed;
        }
        allTasks.push({
          ...task,
          attendanceId: record._id,
          taskDate: record.date,
          liveDurationMinutes,
          liveDurationFormatted: formatDurationMinutes(liveDurationMinutes),
        });
      });
    });

    res.json({ success: true, tasks: allTasks, records: records.map(r => ({
      _id: r._id,
      date: r.date,
      punchIn: r.punchIn,
      punchOut: r.punchOut,
      workStatus: r.workStatus,
    }))});
  } catch (err) {
    console.error('Tasks/today error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// PATCH /api/attendance/tasks/:attendanceId/:taskId/status — Change task status
// Body: { action: 'start' | 'complete' | 'pending' }
router.patch('/tasks/:attendanceId/:taskId/status', authStaff, async (req, res) => {
  try {
    const { attendanceId, taskId } = req.params;
    const { action } = req.body;

    if (!['start', 'complete', 'pending'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use: start, complete, pending' });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      staff: req.staff._id,
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    // Find the task in the top-level tasks array
    const taskIndex = attendance.tasks.findIndex(t => t._id.toString() === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const task = attendance.tasks[taskIndex];
    const now = new Date();
    let stoppedPreviousTask = null;

    if (action === 'start') {
      // ── Check for another running task across ALL attendance records today ──
      const today = getStartOfDay();
      const allTodayRecords = await Attendance.find({
        staff: req.staff._id,
        date: { $gte: today, $lt: new Date(today.getTime() + 86400000) }
      });

      for (const rec of allTodayRecords) {
        const runningTaskIdx = rec.tasks.findIndex(t =>
          t.isRunning && t._id.toString() !== taskId
        );
        if (runningTaskIdx !== -1) {
          const runningTask = rec.tasks[runningTaskIdx];
          // Stop the running task and save elapsed time
          const elapsed = calcElapsedMinutes(runningTask.startedAt);
          runningTask.durationMinutes = (runningTask.durationMinutes || 0) + elapsed;
          runningTask.isRunning = false;
          runningTask.status = 'In Progress'; // keep In Progress, just stop timer
          runningTask.lastUpdated = now;
          stoppedPreviousTask = {
            taskId: runningTask._id,
            description: runningTask.description,
            durationMinutes: runningTask.durationMinutes
          };
          await rec.save();
          break;
        }
      }

      // ── Start this task ──
      task.status = 'In Progress';
      task.startedAt = task.startedAt || now; // don't overwrite if already set
      task.isRunning = true;
      task.lastUpdated = now;

    } else if (action === 'complete') {
      // Check if task was never started
      if (!task.startedAt) {
        return res.json({
          success: true,
          needsManualDuration: true,
          message: 'Start time not found. Please enter duration manually.',
          taskId: task._id,
          attendanceId: attendance._id,
        });
      }

      // Calculate duration
      const elapsed = calcElapsedMinutes(task.startedAt);
      task.durationMinutes = (task.durationMinutes || 0) + elapsed;
      task.status = 'Completed';
      task.completedAt = now;
      task.isRunning = false;
      task.lastUpdated = now;

    } else if (action === 'pending') {
      // Stop timer if running and save elapsed time
      if (task.isRunning && task.startedAt) {
        const elapsed = calcElapsedMinutes(task.startedAt);
        task.durationMinutes = (task.durationMinutes || 0) + elapsed;
      }
      task.status = 'Pending';
      task.isRunning = false;
      task.completedAt = null;
      task.lastUpdated = now;
    }

    // Sync back to sessions array if present
    if (Array.isArray(attendance.sessions)) {
      for (const session of attendance.sessions) {
        if (Array.isArray(session.tasks)) {
          const sidx = session.tasks.findIndex(t => t._id && t._id.toString() === taskId);
          if (sidx !== -1) {
            session.tasks[sidx] = { ...session.tasks[sidx].toObject?.() || session.tasks[sidx], ...task.toObject?.() || task };
            break;
          }
        }
      }
    }

    await attendance.save();

    const nowMs = Date.now();
    let liveDurationMinutes = task.durationMinutes || 0;
    if (task.isRunning && task.startedAt) {
      liveDurationMinutes += Math.round((nowMs - new Date(task.startedAt).getTime()) / 60000);
    }

    res.json({
      success: true,
      message: `Task ${action === 'start' ? 'started' : action === 'complete' ? 'completed' : 'moved to pending'}`,
      task: { ...task.toObject(), liveDurationMinutes, liveDurationFormatted: formatDurationMinutes(liveDurationMinutes) },
      stoppedPreviousTask,
    });
  } catch (err) {
    console.error('Task status update error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update task status' });
  }
});

// PATCH /api/attendance/tasks/:attendanceId/:taskId/manual-duration — Save manual duration
// Body: { hours: number, minutes: number }
router.patch('/tasks/:attendanceId/:taskId/manual-duration', authStaff, async (req, res) => {
  try {
    const { attendanceId, taskId } = req.params;
    const { hours = 0, minutes = 0 } = req.body;

    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid duration (at least 1 minute)' });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      staff: req.staff._id,
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const taskIndex = attendance.tasks.findIndex(t => t._id.toString() === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const now = new Date();
    const task = attendance.tasks[taskIndex];
    task.durationMinutes = totalMinutes;
    task.status = 'Completed';
    task.completedAt = now;
    task.isRunning = false;
    task.lastUpdated = now;
    // Estimate startedAt from manual duration
    if (!task.startedAt) {
      task.startedAt = new Date(now.getTime() - totalMinutes * 60000);
    }

    await attendance.save();

    res.json({
      success: true,
      message: `Task marked as completed with ${hours}h ${minutes}m duration`,
      task: { ...task.toObject(), liveDurationFormatted: formatDurationMinutes(totalMinutes) },
    });
  } catch (err) {
    console.error('Manual duration error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save duration' });
  }
});

// GET /api/attendance/tasks/admin/team — Admin: view all team tasks with running indicators
router.get('/tasks/admin/team', authAdmin, async (req, res) => {
  try {
    const today = getStartOfDay();
    const { date } = req.query;
    const targetDate = date ? new Date(date) : today;
    targetDate.setUTCHours(0, 0, 0, 0);

    const records = await Attendance.find({
      admin: req.user._id,
      date: { $gte: targetDate, $lt: new Date(targetDate.getTime() + 86400000) }
    })
      .populate('staff', 'fullName employeeId designation department')
      .lean();

    const nowMs = Date.now();
    const teamTasks = [];

    records.forEach(record => {
      (record.tasks || []).forEach(task => {
        let liveDurationMinutes = task.durationMinutes || 0;
        if (task.isRunning && task.startedAt) {
          const elapsed = Math.round((nowMs - new Date(task.startedAt).getTime()) / 60000);
          liveDurationMinutes = (task.durationMinutes || 0) + elapsed;
        }
        teamTasks.push({
          ...task,
          attendanceId: record._id,
          taskDate: record.date,
          staff: record.staff,
          liveDurationMinutes,
          liveDurationFormatted: formatDurationMinutes(liveDurationMinutes),
        });
      });
    });

    // Sort: running first, then In Progress, then Pending, then Completed
    const statusOrder = { 'In Progress': 0, 'Pending': 1, 'Completed': 2 };
    teamTasks.sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    });

    res.json({
      success: true,
      tasks: teamTasks,
      summary: {
        total: teamTasks.length,
        running: teamTasks.filter(t => t.isRunning).length,
        inProgress: teamTasks.filter(t => t.status === 'In Progress').length,
        completed: teamTasks.filter(t => t.status === 'Completed').length,
        pending: teamTasks.filter(t => t.status === 'Pending').length,
      }
    });
  } catch (err) {
    console.error('Admin team tasks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch team tasks' });
  }
});

// GET /api/attendance/today
router.get('/today', authStaff, async (req, res) => {
  try {
    const today = getStartOfDay();
    const attendance = await Attendance.findOne({
      staff: req.staff._id,
      date: today
    });

    if (attendance) {
      syncAttendanceRecord(attendance, new Date());
      await attendance.save();
    }

    res.json({ success: true, attendance: attendance ? attendance.toObject() : null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch record' });
  }
});

// GET /api/attendance/active — Returns today's open shift (punched in but not out)
router.get('/active', authStaff, async (req, res) => {
  try {
    const today = getStartOfDay();
    let attendance = await Attendance.findOne({
      staff: req.staff._id,
      date: today
    });

    if (attendance) {
      syncAttendanceRecord(attendance, new Date());
      await attendance.save();
    }

    const activeShift = attendance && attendance.sessions?.some((session) => session.isActive)
      ? attendance.toObject()
      : null;

    res.json({ success: true, activeShift });
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

    // Projection keeps the payload small while still allowing us to compute
    // aggregate metrics from the stored session list.
    const history = await Attendance.find(filter)
      .sort({ date: -1 })
      .lean()
      .select('date punchIn punchOut totalHours overtimeHours status workStatus tasks notes sessions sessionCount');

    const nowMs = Date.now();
    const recordsWithLiveHours = history.map(record => {
      const activeSession = Array.isArray(record.sessions) ? record.sessions.find(session => session && session.isActive) : null;
      if (activeSession) {
        const liveHours = parseFloat(((nowMs - new Date(activeSession.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2));
        const totalHours = parseFloat(((record.totalHours || 0) + liveHours).toFixed(2));
        return { ...record, totalHours, workStatus: 'Active', punchOut: null };
      }
      return record;
    });

    const mappedHistory = recordsWithLiveHours.map(record => {
      if (Array.isArray(record.sessions) && record.sessions.some(session => session && session.isActive)) {
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

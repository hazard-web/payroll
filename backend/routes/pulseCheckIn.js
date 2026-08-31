const express = require('express');
const router = express.Router();
const { auth } = require('./auth');
const PulseWorkDay = require('../models/PulseWorkDay');
const User = require('../models/User');
const Staff = require('../models/Staff');
const LeavePolicy = require('../models/LeavePolicy');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');
const AssignedTask = require('../models/AssignedTask');
const { logActivity } = require('../utils/logger');
const { isPulseAdmin, orgIdOf } = require('../utils/pulseAuth');
const {
  clientIp,
  clientUserAgent,
  normalizeLocation,
  formatLocationLabel,
} = require('../utils/requestMeta');

const TARGET_HOURS = 9;

function todayKey(raw) {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return String(raw);
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function msToHours(ms) {
  return Math.round((Math.max(0, Number(ms) || 0) / 3_600_000) * 100) / 100;
}

async function getOrCreateDay(userId, email, date) {
  let doc = await PulseWorkDay.findOne({ user: userId, date });
  if (doc) return doc;
  doc = await PulseWorkDay.create({
    user: userId,
    email: String(email || '').toLowerCase(),
    date,
    targetHours: TARGET_HOURS,
    status: 'idle',
  });
  return doc;
}

function serializeDay(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    ...plain,
    totalActiveHours: msToHours(plain.totalActiveMs),
    targetHours: plain.targetHours || TARGET_HOURS,
  };
}

function shiftKey(key, days) {
  const [y, m, d] = String(key).split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function enumerateKeys(fromKey, toKey) {
  const start = fromKey <= toKey ? fromKey : toKey;
  const end = fromKey <= toKey ? toKey : fromKey;
  const keys = [];
  let cur = start;
  while (cur <= end) {
    keys.push(cur);
    cur = shiftKey(cur, 1);
  }
  return keys;
}

function weekdayOf(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function dayKeyOf(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function recordIsPresent(row) {
  if (!row) return false;
  if (Number(row.totalActiveMs) > 0) return true;
  if (Number(row.totalActiveHours) > 0) return true;
  if (['active', 'stopped', 'closed'].includes(row.status)) return true;
  return Array.isArray(row.sessions) && row.sessions.length > 0;
}

function recordIsLate(row) {
  const stamp =
    row?.events?.find((event) => event.type === 'CHECK_IN')?.at ||
    row?.sessions?.[0]?.checkInAt;
  if (!stamp) return false;
  const at = new Date(stamp);
  if (Number.isNaN(at.getTime())) return false;
  return at.getHours() > 9 || (at.getHours() === 9 && at.getMinutes() > 30);
}

// GET /api/pulse-checkin/today
router.get('/today', auth, async (req, res) => {
  try {
    const date = todayKey(req.query.date);
    const doc = await PulseWorkDay.findOne({ user: req.user._id, date }).lean();
    res.json({ success: true, data: doc ? serializeDay(doc) : null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load day' });
  }
});

// GET /api/pulse-checkin/admin/days — org-wide check-in audit (admin only)
router.get('/admin/days', auth, async (req, res) => {
  try {
    if (!isPulseAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const organizationId = orgIdOf(req.user);
    const members = await User.find({
      $or: [{ organizationId }, { _id: organizationId }],
    })
      .select('_id')
      .lean();
    const userIds = members.map((m) => m._id);
    if (!userIds.length) {
      return res.json({ success: true, data: [] });
    }

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60));
    const days = await PulseWorkDay.find({ user: { $in: userIds } })
      .sort({ date: -1, updatedAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: days.map((d) => serializeDay(d)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load days' });
  }
});

// POST /api/pulse-checkin/check-in
router.post('/check-in', auth, async (req, res) => {
  try {
    const date = todayKey(req.body?.date);
    const email = String(req.body?.email || req.user.email || '').toLowerCase();
    const activeMs = Math.max(0, Number(req.body?.activeMs) || 0);
    const location = normalizeLocation(req.body?.location);
    const ip = clientIp(req);
    const userAgent = clientUserAgent(req);
    const now = new Date();

    const doc = await getOrCreateDay(req.user._id, email, date);
    if (doc.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This day is already closed for timesheet' });
    }

    const isResume = Boolean(doc.sessions?.length);
    doc.status = 'active';
    doc.totalActiveMs = Math.max(doc.totalActiveMs || 0, activeMs);
    doc.email = email;

    doc.sessions.push({
      checkInAt: now,
      durationMs: 0,
      ip,
      userAgent,
      locationIn: location,
    });

    doc.events.push({
      type: isResume ? 'RESUME' : 'CHECK_IN',
      at: now,
      activeMsAtEvent: doc.totalActiveMs,
      ip,
      userAgent,
      location,
    });

    await doc.save();

    await logActivity(
      req.user._id,
      isResume ? 'PULSE_RESUME' : 'PULSE_CHECK_IN',
      `${email} checked in at ${now.toISOString()} · ${formatLocationLabel(location)} · IP ${ip || 'n/a'}`,
      {
        date,
        email,
        ip,
        userAgent,
        location,
        activeMs: doc.totalActiveMs,
        eventType: isResume ? 'RESUME' : 'CHECK_IN',
        workDayId: doc._id,
      },
    );

    res.json({ success: true, data: serializeDay(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Check-in failed' });
  }
});

// POST /api/pulse-checkin/check-out
router.post('/check-out', auth, async (req, res) => {
  try {
    const date = todayKey(req.body?.date);
    const email = String(req.body?.email || req.user.email || '').toLowerCase();
    const activeMs = Math.max(0, Number(req.body?.activeMs) || 0);
    const location = normalizeLocation(req.body?.location);
    const ip = clientIp(req);
    const userAgent = clientUserAgent(req);
    const now = new Date();

    const doc = await getOrCreateDay(req.user._id, email, date);
    doc.totalActiveMs = Math.max(doc.totalActiveMs || 0, activeMs);
    doc.status = 'stopped';
    doc.email = email;

    const open = [...(doc.sessions || [])].reverse().find((s) => s.checkInAt && !s.checkOutAt);
    if (open) {
      open.checkOutAt = now;
      open.durationMs = Math.max(0, now.getTime() - new Date(open.checkInAt).getTime());
      open.locationOut = location;
      open.ip = open.ip || ip;
      open.userAgent = open.userAgent || userAgent;
    } else {
      doc.sessions.push({
        checkInAt: now,
        checkOutAt: now,
        durationMs: 0,
        ip,
        userAgent,
        locationOut: location,
      });
    }

    doc.events.push({
      type: 'CHECK_OUT',
      at: now,
      activeMsAtEvent: doc.totalActiveMs,
      ip,
      userAgent,
      location,
    });

    const targetMs = (doc.targetHours || TARGET_HOURS) * 3_600_000;
    if (!doc.targetReachedAt && doc.totalActiveMs >= targetMs) {
      doc.targetReachedAt = now;
      doc.events.push({
        type: 'TARGET_REACHED',
        at: now,
        activeMsAtEvent: doc.totalActiveMs,
        ip,
        userAgent,
        location,
      });
      await logActivity(
        req.user._id,
        'PULSE_TARGET_REACHED',
        `${email} reached ${doc.targetHours || TARGET_HOURS}h target on ${date}`,
        { date, email, activeMs: doc.totalActiveMs, workDayId: doc._id },
      );
    }

    await doc.save();

    await logActivity(
      req.user._id,
      'PULSE_CHECK_OUT',
      `${email} checked out at ${now.toISOString()} · worked ${msToHours(doc.totalActiveMs)}h · ${formatLocationLabel(location)} · IP ${ip || 'n/a'}`,
      {
        date,
        email,
        ip,
        userAgent,
        location,
        activeMs: doc.totalActiveMs,
        hours: msToHours(doc.totalActiveMs),
        eventType: 'CHECK_OUT',
        workDayId: doc._id,
      },
    );

    res.json({ success: true, data: serializeDay(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Check-out failed' });
  }
});

// POST /api/pulse-checkin/sync — heartbeat / activeMs update while checked in
router.post('/sync', auth, async (req, res) => {
  try {
    const date = todayKey(req.body?.date);
    const activeMs = Math.max(0, Number(req.body?.activeMs) || 0);
    const doc = await PulseWorkDay.findOne({ user: req.user._id, date });
    if (!doc) return res.json({ success: true, data: null });

    doc.totalActiveMs = Math.max(doc.totalActiveMs || 0, activeMs);
    const targetMs = (doc.targetHours || TARGET_HOURS) * 3_600_000;
    if (!doc.targetReachedAt && doc.totalActiveMs >= targetMs) {
      const now = new Date();
      doc.targetReachedAt = now;
      doc.events.push({
        type: 'TARGET_REACHED',
        at: now,
        activeMsAtEvent: doc.totalActiveMs,
        ip: clientIp(req),
        userAgent: clientUserAgent(req),
      });
      await logActivity(
        req.user._id,
        'PULSE_TARGET_REACHED',
        `${doc.email} reached ${doc.targetHours || TARGET_HOURS}h target on ${date}`,
        { date, email: doc.email, activeMs: doc.totalActiveMs, workDayId: doc._id },
      );
    }
    await doc.save();
    res.json({ success: true, data: serializeDay(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Sync failed' });
  }
});

// POST /api/pulse-checkin/finalize-day — midnight / new-day timesheet log
router.post('/finalize-day', auth, async (req, res) => {
  try {
    const date = todayKey(req.body?.date);
    const email = String(req.body?.email || req.user.email || '').toLowerCase();
    const activeMs = Math.max(0, Number(req.body?.activeMs) || 0);
    const location = normalizeLocation(req.body?.location);
    const ip = clientIp(req);
    const userAgent = clientUserAgent(req);
    const now = new Date();

    const doc = await getOrCreateDay(req.user._id, email, date);
    doc.totalActiveMs = Math.max(doc.totalActiveMs || 0, activeMs);
    doc.email = email;

    const open = [...(doc.sessions || [])].reverse().find((s) => s.checkInAt && !s.checkOutAt);
    if (open) {
      open.checkOutAt = now;
      open.durationMs = Math.max(0, now.getTime() - new Date(open.checkInAt).getTime());
      open.locationOut = location || open.locationOut;
    }

    if (!doc.timesheetLogged) {
      doc.timesheetLogged = true;
      doc.timesheetLoggedAt = now;
      doc.timesheetHours = msToHours(doc.totalActiveMs);
      doc.status = 'closed';
      doc.events.push({
        type: 'MIDNIGHT_CLOSE',
        at: now,
        activeMsAtEvent: doc.totalActiveMs,
        ip,
        userAgent,
        location,
      });
      await doc.save();

      await logActivity(
        req.user._id,
        'PULSE_TIMESHEET_DAY',
        `${email} timesheet for ${date}: ${doc.timesheetHours}h logged at midnight close · IP ${ip || 'n/a'} · ${formatLocationLabel(location)}`,
        {
          date,
          email,
          ip,
          userAgent,
          location,
          activeMs: doc.totalActiveMs,
          hours: doc.timesheetHours,
          eventType: 'MIDNIGHT_CLOSE',
          workDayId: doc._id,
        },
      );
    } else {
      await doc.save();
    }

    res.json({ success: true, data: serializeDay(doc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Finalize failed' });
  }
});

// GET /api/pulse-checkin/week?from=yyyy-MM-dd&to=yyyy-MM-dd
router.get('/week', auth, async (req, res) => {
  try {
    const from = todayKey(req.query.from);
    const to = todayKey(req.query.to);
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const days = await PulseWorkDay.find({
      user: req.user._id,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();
    const workDays = Array.isArray(req.user.defaultWorkDays) && req.user.defaultWorkDays.length
      ? req.user.defaultWorkDays
      : [1, 2, 3, 4, 5];
    res.json({
      success: true,
      data: {
        from: start,
        to: end,
        workDays,
        days: days.map((d) => serializeDay(d)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load week' });
  }
});

// GET /api/pulse-checkin/overview — My Space week, month, leave, feeds
router.get('/overview', auth, async (req, res) => {
  try {
    const today = todayKey();
    const weekFrom = todayKey(req.query.from);
    const weekTo = todayKey(req.query.to);
    const start = weekFrom <= weekTo ? weekFrom : weekTo;
    const end = weekFrom <= weekTo ? weekTo : weekFrom;
    const monthFrom = `${today.slice(0, 7)}-01`;
    const orgId = orgIdOf(req.user);
    const workDays = Array.isArray(req.user.defaultWorkDays) && req.user.defaultWorkDays.length
      ? req.user.defaultWorkDays
      : [1, 2, 3, 4, 5];
    const workDaySet = new Set(workDays.map((d) => Number(d)));

    const [weekDocs, monthDocs, policy, staff, announcements] = await Promise.all([
      PulseWorkDay.find({
        user: req.user._id,
        date: { $gte: start, $lte: end },
      })
        .sort({ date: 1 })
        .lean(),
      PulseWorkDay.find({
        user: req.user._id,
        date: { $gte: monthFrom, $lte: today },
      })
        .sort({ date: 1 })
        .lean(),
      LeavePolicy.findOne({ user: orgId }).lean(),
      Staff.findOne({
        email: String(req.user.email || '').toLowerCase(),
        user: orgId,
      }).lean(),
      Announcement.find({
        user: orgId,
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: new Date() } }] },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const holidays = (policy?.holidays || [])
      .map(dayKeyOf)
      .filter(Boolean);
    const holidaySet = new Set(holidays);

    let leaveDates = [];
    let monthLeaveDates = [];
    let leaveBalances = [];
    let approvals = [];

    if (policy) {
      const casualTotal = Number(policy.casualLeave?.daysPerYear) || 12;
      const sickTotal = Number(policy.sickLeave?.daysPerYear) || 12;
      const casualLeft = staff?.leaveBalance?.casual != null
        ? Number(staff.leaveBalance.casual)
        : casualTotal;
      const sickLeft = staff?.leaveBalance?.sick != null
        ? Number(staff.leaveBalance.sick)
        : sickTotal;
      leaveBalances = [
        {
          name: 'Casual',
          used: Math.max(0, casualTotal - casualLeft),
          total: casualTotal,
          color: '#1A5F4A',
        },
        {
          name: 'Sick',
          used: Math.max(0, sickTotal - sickLeft),
          total: sickTotal,
          color: '#d97706',
        },
      ];
    }
    if (!leaveBalances.length) {
      leaveBalances = [
        { name: 'Casual', used: 0, total: 12, color: '#1A5F4A' },
        { name: 'Sick', used: 0, total: 12, color: '#d97706' },
      ];
    }

    if (staff) {
      const leaves = await LeaveRequest.find({
        staff: staff._id,
        status: 'Approved',
        startDate: { $lte: new Date(`${end}T23:59:59`) },
        endDate: { $gte: new Date(`${monthFrom}T00:00:00`) },
      })
        .select('startDate endDate')
        .lean();
      leaves.forEach((row) => {
        enumerateKeys(dayKeyOf(row.startDate), dayKeyOf(row.endDate)).forEach((key) => {
          if (key >= start && key <= end) leaveDates.push(key);
          if (key >= monthFrom && key <= today) monthLeaveDates.push(key);
        });
      });
      leaveDates = [...new Set(leaveDates)];
      monthLeaveDates = [...new Set(monthLeaveDates)];
    }

    const pendingQuery = isPulseAdmin(req.user)
      ? { admin: orgId, status: 'Pending' }
      : staff
        ? { staff: staff._id, status: 'Pending' }
        : null;
    if (pendingQuery) {
      const pendingLeaves = await LeaveRequest.find(pendingQuery)
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('staff', 'fullName email')
        .lean();
      approvals = pendingLeaves.map((row) => ({
        key: String(row._id),
        type: 'Leave',
        subject: `${row.type || 'Leave'} · ${dayKeyOf(row.startDate)} – ${dayKeyOf(row.endDate)}`,
        from: row.staff?.fullName || row.staff?.email || 'Team',
        status: row.status,
        due: dayKeyOf(row.startDate) || today,
      }));
    }

    if (staff) {
      const tasks = await AssignedTask.find({
        staff: staff._id,
        status: { $in: ['Pending', 'Accepted', 'In Progress'] },
      })
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(6)
        .lean();
      approvals = [
        ...approvals,
        ...tasks.map((row) => ({
          key: `task-${row._id}`,
          type: 'Task',
          subject: row.title,
          from: 'You',
          status: row.status,
          due: dayKeyOf(row.dueDate) || '—',
        })),
      ];
    }

    const monthByDate = new Map(monthDocs.map((row) => [row.date, row]));
    const monthLeaveSet = new Set(monthLeaveDates);
    const firstRecord = monthDocs.reduce((min, row) => (!min || row.date < min ? row.date : min), null);
    const hasEarlierHistory = Boolean(firstRecord && firstRecord < start);
    const scoreFrom = hasEarlierHistory ? monthFrom : (start > monthFrom ? start : monthFrom);
    let present = 0;
    let absent = 0;
    let late = 0;
    let hours = 0;
    let workdayCount = 0;

    enumerateKeys(scoreFrom, today).forEach((key) => {
      const weekend = !workDaySet.has(weekdayOf(key));
      if (weekend || holidaySet.has(key)) return;
      const row = monthByDate.get(key);
      const onLeave = monthLeaveSet.has(key);
      if (onLeave) return;
      const isToday = key === today;
      const presentDay = recordIsPresent(row) || (isToday && row?.status === 'active');
      if (isToday && !presentDay) return;
      workdayCount += 1;
      if (presentDay) {
        present += 1;
        if (recordIsLate(row)) late += 1;
      } else {
        absent += 1;
      }
      hours += msToHours(row?.totalActiveMs);
    });

    res.json({
      success: true,
      data: {
        from: start,
        to: end,
        workDays,
        days: weekDocs.map((d) => serializeDay(d)),
        holidays,
        leaveDates,
        leaveBalances,
        approvals,
        announcements: announcements.map((row) => ({
          id: String(row._id),
          title: row.title,
          message: row.message,
          priority: row.priority,
          createdAt: row.createdAt,
        })),
        profile: {
          name: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ')
            || req.user.displayName
            || String(req.user.email || '').split('@')[0],
          email: req.user.email,
          company: req.user.companyName || '',
          role: req.user.role || 'admin',
          designation: staff?.designation || '',
          department: staff?.department || '',
          shift: { name: 'General', hours: '' },
        },
        month: {
          from: monthFrom,
          to: today,
          present,
          absent,
          late,
          hours,
          workdayCount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load overview' });
  }
});

module.exports = router;

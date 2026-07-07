const Attendance    = require('../models/Attendance');
const Notification  = require('../models/Notification');
const { sendPunchOutReminderEmail } = require('./emailService');
const { closeAttendanceSession, getDayStart } = require('./attendanceService');

const fmt = (start, end = new Date()) => {
  const ms = Math.max(0, new Date(end) - new Date(start));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// In MongoDB, { field: null } matches both explicit null and missing fields.
const notPunchedOut = null;

async function autoPunchOutMissedSessions(now = new Date()) {
  const previousDay = getDayStart(now);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  const missedRecords = await Attendance.find({
    date: previousDay,
    'sessions.isActive': true
  }).populate('staff');

  let autoClosed = 0;
  for (const record of missedRecords) {
    const activeSession = Array.isArray(record.sessions) ? record.sessions.find((session) => session && session.isActive) : null;
    if (!activeSession) continue;

    const result = closeAttendanceSession(record, {
      endTime: now,
      source: 'AUTO_PUNCH_OUT',
      reason: 'System auto punch out at end of day'
    });

    if (!result.success) continue;

    record.lastAutoPunchOutAt = now;
    record.lastAutoPunchOutReason = 'System auto punch out at end of day';
    record.notes = record.notes ? `${record.notes}\n` : '' + 'System auto punch out at end of day';
    await record.save();
    autoClosed++;

    if (!record.staff) continue;
    await new Notification({
      admin: record.admin,
      staff: record.staff._id,
      recipientType: 'staff',
      type: 'ATTENDANCE_ALERT',
      referenceId: record._id,
      message: 'Your previous day attendance was automatically punched out by the system because no manual punch-out was recorded.'
    }).save();
  }

  return { autoClosed };
}

async function runShiftCheck() {
  const loginUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://rohit98k-payroll-portal.vercel.app';
  const now = new Date();

  const previousDayAutoPunchOut = await autoPunchOutMissedSessions(now);
  const nineHalfAgo     = new Date(now - 9.5  * 60 * 60 * 1000);
  const eightHalfAgo    = new Date(now - 8.5  * 60 * 60 * 1000);

  // ── 1. Auto-close shifts that have been open > 9.5 hours (Full Day + 1h OT cap) ──
  const overdueShifts = await Attendance.find({
    status: 'incomplete',
    punchOut: notPunchedOut,
    punchIn: { $lte: nineHalfAgo }
  }).populate('staff');

  let autoClosed = 0;
  for (const shift of overdueShifts) {
    const duration = fmt(shift.punchIn, now);

    shift.punchOut      = new Date(shift.punchIn.getTime() + 9.5 * 60 * 60 * 1000);
    shift.totalHours    = 9.5;
    shift.overtimeHours = 1.0;
    shift.workStatus    = 'Full Day';
    shift.status        = 'flagged';
    shift.notes         = (shift.notes ? shift.notes + ' | ' : '') +
                          'System: Auto-closed after 9.5 hours maximum duration (Full Day + 1h OT).';
    await shift.save();
    autoClosed++;

    if (!shift.staff) continue;

    // In-app notification for everyone
    await new Notification({
      admin:         shift.admin,
      staff:         shift.staff._id,
      recipientType: 'staff',
      type:          'ATTENDANCE_ALERT',
      referenceId:   shift._id,
      message:       `Your shift on ${new Date(shift.date).toLocaleDateString()} was automatically closed after 10 hours. Please review your attendance.`
    }).save();

    // Email — send to ALL staff who have a portal account and an email address
    if (shift.staff.isPortalEnabled && shift.staff.email) {
      await sendPunchOutReminderEmail(shift.staff, loginUrl, {
        loginTime:  new Date(shift.punchIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        shiftDate:  new Date(shift.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        duration,
        workStatus: 'Auto Closed / Flagged',
        reason:     'Your shift was automatically closed after 10 hours. Contact HR/Admin if a correction is needed.',
        autoClosed: true
      }).catch(err => console.error('Auto-close email error:', err.message));
    }
  }

  // ── 2. Reminder: shifts between 8.5 h and 9.5 h (still active) ───────────
  const reminderShifts = await Attendance.find({
    status:   'incomplete',
    punchOut: notPunchedOut,
    punchIn:  { $gt: nineHalfAgo, $lte: eightHalfAgo }
  }).populate('staff');

  let remindersSent = 0;
  for (const shift of reminderShifts) {
    if (!shift.staff?.isPortalEnabled || !shift.staff?.email) continue;

    // Don't send a second reminder for the same shift
    const alreadyNotified = await Notification.exists({
      staff:       shift.staff._id,
      referenceId: shift._id,
      type:        'ATTENDANCE_ALERT'
    });
    if (alreadyNotified) continue;

    const isOT    = Boolean(shift.staff.overtimeEligible);
    const duration = fmt(shift.punchIn, now);

    const reason = isOT
      ? 'You have completed your standard hours (8.5h). If you are continuing as overtime, remember the maximum OT allowed is 1 hour. Please punch out before the 9.5-hour mark.'
      : 'You have been punched in for over 8.5 hours — your full day is complete. Please punch out now.';

    const workStatus = isOT ? 'Overtime in Progress' : 'Full Day Logged';

    // Email reminder
    await sendPunchOutReminderEmail(shift.staff, loginUrl, {
      loginTime: new Date(shift.punchIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      shiftDate: new Date(shift.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      duration,
      workStatus,
      reason,
      autoClosed: false
    }).catch(err => console.error('Reminder email error:', err.message));

    // In-app notification
    await new Notification({
      admin:         shift.admin,
      staff:         shift.staff._id,
      recipientType: 'staff',
      type:          'ATTENDANCE_ALERT',
      referenceId:   shift._id,
      message:       isOT
        ? 'You have completed 8.5+ hours. Overtime maximum is 1 additional hour — please punch out before 9.5 hours.'
        : 'Reminder: 8.5+ hours logged. Your full day is complete. Please punch out.'
    }).save();

    remindersSent++;
  }

  console.log(`[cronJobs] autoClosed=${autoClosed} remindersSent=${remindersSent} priorDayAutoPunchOut=${previousDayAutoPunchOut.autoClosed}`);
  return { autoClosed, remindersSent, priorDayAutoPunchOut: previousDayAutoPunchOut.autoClosed };
}

// ──────────────────────────────────────────────────────────────────
// Office Closing Time: 11:59 PM IST
// IST = UTC + 5:30, so 11:59 PM IST = 18:29 UTC
// ──────────────────────────────────────────────────────────────────

/**
 * Get current time in IST (hours and minutes).
 * Always uses IST regardless of server timezone.
 */
function getISTTime(reference = new Date()) {
  const now = new Date(reference);
  // IST offset: UTC + 5 hours 30 minutes = 330 minutes
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return {
    hours: istNow.getUTCHours(),
    minutes: istNow.getUTCMinutes(),
    totalMinutes: istNow.getUTCHours() * 60 + istNow.getUTCMinutes(),
    date: istNow,
  };
}

function getISTDayRange(reference = new Date()) {
  const { date: istDate } = getISTTime(reference);
  const startUtcMs = Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate(),
    0, 0, 0, 0
  ) - (5.5 * 60 * 60 * 1000);

  return {
    start: new Date(startUtcMs),
    end: new Date(startUtcMs + 24 * 60 * 60 * 1000),
    close: new Date(startUtcMs + (23 * 60 + 59) * 60 * 1000),
  };
}

/**
 * Compute workStatus and totalHours from punchIn → punchOut (11:59 PM IST).
 * Rules:
 *  Full Day  → 8.5+ hours
 *  Half Day  → 4 to 8.49 hours
 *  LOP       → < 4 hours
 */
function computeWorkStatus(punchIn, punchOut) {
  const diffMs = Math.max(0, new Date(punchOut) - new Date(punchIn));
  const totalHours = diffMs / 3600000;
  let workStatus;
  if (totalHours >= 8.5) workStatus = 'Full Day';
  else if (totalHours >= 4)  workStatus = 'Half Day';
  else                       workStatus = 'LOP';
  return { totalHours: parseFloat(totalHours.toFixed(2)), workStatus };
}

/**
 * 11:30 PM IST — Send reminder emails to all staff still punched in.
 * Won't send duplicate reminders for the same shift.
 */
async function runOfficeClosingReminder() {
  const loginUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://rohit98k-payroll-portal.vercel.app';
  const now = new Date();
  const officeDay = getISTDayRange(now);

  const activeShifts = await Attendance.find({
    status:   'incomplete',
    punchOut: notPunchedOut,
    punchIn:  { $gte: officeDay.start, $lt: officeDay.end, $lte: officeDay.close }
  }).populate('staff');

  let remindersSent = 0;
  for (const shift of activeShifts) {
    if (!shift.staff?.isPortalEnabled || !shift.staff?.email) continue;

    // Skip if we already sent an office-closing reminder for this shift
    const alreadyReminded = await Notification.exists({
      staff:       shift.staff._id,
      referenceId: shift._id,
      type:        'OFFICE_CLOSING_REMINDER'
    });
    if (alreadyReminded) continue;

    const duration = fmt(shift.punchIn, now);

    // Send reminder email
    await sendPunchOutReminderEmail(shift.staff, loginUrl, {
      loginTime:  new Date(shift.punchIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      shiftDate:  new Date(shift.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      duration,
      workStatus: 'In Progress',
      reason:     'Office closing time (11:59 PM) has been reached. Please punch out within 30 minutes, or the system will automatically mark your attendance at 11:59 PM.',
      autoClosed: false,
      officeClosing: true,
    }).catch(err => console.error('[Office Closing] Reminder email error:', err.message));

    // In-app notification — use distinct type to avoid conflict with shift-duration reminders
    await new Notification({
      admin:         shift.admin,
      staff:         shift.staff._id,
      recipientType: 'staff',
      type:          'OFFICE_CLOSING_REMINDER',
      referenceId:   shift._id,
      message:       '⏰ Office closing time (11:59 PM) reached. Please punch out now. If not done within 30 minutes, your attendance will be auto-closed at 11:59 PM.'
    }).save();

    remindersSent++;
  }

  console.log(`[cronJobs] Office Closing Reminder: remindersSent=${remindersSent}`);
  return { remindersSent };
}

/**
 * 11:59 PM IST — Auto punch-out all staff still active.
 * Closes shift at exactly 11:59 PM IST, marks as flagged.
 */
async function runOfficeClosingAutoClose() {
  const loginUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://rohit98k-payroll-portal.vercel.app';
  const now = new Date();
  const officeDay = getISTDayRange(now);

  const activeShifts = await Attendance.find({
    status:   'incomplete',
    punchOut: notPunchedOut,
    punchIn:  { $gte: officeDay.start, $lt: officeDay.end, $lte: officeDay.close }
  }).populate('staff');

  let autoClosed = 0;
  for (const shift of activeShifts) {
    const officePunchOut = officeDay.close;

    // If punchIn is after office close (shouldn't normally happen), use punchIn as punchOut
    const effectivePunchOut = officePunchOut > new Date(shift.punchIn)
      ? officePunchOut
      : new Date(shift.punchIn);

    const { totalHours, workStatus } = computeWorkStatus(shift.punchIn, effectivePunchOut);
    const duration = fmt(shift.punchIn, effectivePunchOut);

    shift.punchOut   = effectivePunchOut;
    shift.totalHours = totalHours;
    shift.workStatus = workStatus;
    shift.status     = 'flagged';
    shift.notes      = (shift.notes ? shift.notes + ' | ' : '') +
                       'System: Auto punch-out at 11:59 PM IST (office closing time). Contact HR/Admin if correction needed.';
    await shift.save();
    autoClosed++;

    if (!shift.staff) continue;

    // In-app notification
    await new Notification({
      admin:         shift.admin,
      staff:         shift.staff._id,
      recipientType: 'staff',
      type:          'ATTENDANCE_ALERT',
      referenceId:   shift._id,
      message:       `Your attendance has been auto-closed at 11:59 PM IST (office closing time) on ${new Date(shift.date).toLocaleDateString('en-IN')}. Work status: ${workStatus}. Contact HR if correction needed.`
    }).save();

    // Email — send to staff with portal + email
    if (shift.staff.isPortalEnabled && shift.staff.email) {
      await sendPunchOutReminderEmail(shift.staff, loginUrl, {
        loginTime:  new Date(shift.punchIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        shiftDate:  new Date(shift.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        duration,
        workStatus,
        reason:     'Your attendance has been automatically closed at 11:59 PM IST as you did not punch out before the office closing time. Please contact HR/Admin if any correction is needed.',
        autoClosed: true,
        officeClosing: true,
      }).catch(err => console.error('[Office Closing] Auto-close email error:', err.message));
    }
  }

  console.log(`[cronJobs] Office Closing Auto-Close: autoClosed=${autoClosed}`);
  return { autoClosed };
}

async function runOfficeClosingCheck() {
  const { totalMinutes } = getISTTime();
  const reminderStart = 23 * 60 + 30;   // 11:30 PM IST
  const reminderEnd = reminderStart + 5;
  const autoCloseStart = 23 * 60 + 59;  // 11:59 PM IST
  const autoCloseEnd = autoCloseStart + 5;

  if (totalMinutes >= reminderStart && totalMinutes < reminderEnd) {
    return { action: 'reminder', ...(await runOfficeClosingReminder()) };
  }

  if (totalMinutes >= autoCloseStart && totalMinutes < autoCloseEnd) {
    return { action: 'autoClose', ...(await runOfficeClosingAutoClose()) };
  }

  return { action: 'none', totalMinutes };
}

module.exports = { runShiftCheck, runOfficeClosingReminder, runOfficeClosingAutoClose, runOfficeClosingCheck, getISTTime };

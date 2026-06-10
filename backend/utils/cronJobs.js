const Attendance    = require('../models/Attendance');
const Notification  = require('../models/Notification');
const { sendPunchOutReminderEmail } = require('./emailService');

const fmt = (start, end = new Date()) => {
  const ms = Math.max(0, new Date(end) - new Date(start));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// Match both "field missing" and "field stored as null" (defensive)
const notPunchedOut = { $in: [null, undefined] };

async function runShiftCheck() {
  const loginUrl = process.env.FRONTEND_URL || 'https://payslip-gen-rouge.vercel.app';
  const now = new Date();

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

  console.log(`[cronJobs] autoClosed=${autoClosed} remindersSent=${remindersSent}`);
  return { autoClosed, remindersSent };
}

module.exports = { runShiftCheck };

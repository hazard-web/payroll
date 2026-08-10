const DEFAULT_STANDARD_HOURS = 8;
const FULL_DAY_THRESHOLD = 8;
const HALF_DAY_THRESHOLD = 4;

// ─────────────────────────────────────────────────────────────────────────────
// IST TIMEZONE HELPERS (UTC+5:30)
// ─────────────────────────────────────────────────────────────────────────────
// All attendance boundary calculations MUST use IST, not UTC.
// UTC 23:59:59 = IST 05:29:59 AM next day — that's why punches showed "05:29 AM".
// IST 23:59:59 = UTC 18:29:59 — this is the correct auto-close boundary.
// ─────────────────────────────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Returns the UTC timestamp for 00:00:00 IST on the IST calendar day
 * that contains the given UTC timestamp.
 *
 * Example: 08:06 AM IST July 13 → IST day start = July 13 00:00 IST = July 12 18:30 UTC
 */
function getISTDayStart(utcDate = new Date()) {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    0, 0, 0, 0
  ) - IST_OFFSET_MS);
}

/**
 * Returns the UTC timestamp for 23:59:59 IST on the IST calendar day
 * that contains the given UTC timestamp.
 *
 * Example: attendance.date = July 13 00:00 UTC
 *   → IST date = July 13 (05:30 IST)
 *   → IST day end = July 13 23:59:59 IST = July 13 18:29:59 UTC ✅
 *
 * This is the CORRECT auto-close cap. Using UTC 23:59:59 was wrong:
 *   July 13 23:59:59 UTC = July 14 05:29:59 IST (next day!) ❌
 */
function getISTDayEnd(utcDate = new Date()) {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    23, 59, 59, 0
  ) - IST_OFFSET_MS);
}

/**
 * Returns the IST day-of-week (0=Sun, 1=Mon, … 6=Sat) for a UTC timestamp.
 * Use this instead of Date.getUTCDay() for working-day validation in IST,
 * so early IST morning punches (e.g., 12:30 AM IST Monday) are correctly
 * identified as Monday rather than Sunday (UTC).
 */
function getISTDayOfWeek(utcDate = new Date()) {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.getUTCDay();
}

// ─────────────────────────────────────────────────────────────────────────────
// UTC HELPERS (kept for backward-compatible DB queries)
// attendance.date is stored as UTC midnight — queries must match that.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date;
}

/** Returns UTC midnight of the given date (used for DB date-field queries). */
function getDayStart(date) {
  const value = normalizeDate(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

/** Returns UTC 23:59:59 of the given date (legacy — prefer getISTDayEnd for caps). */
function getDayEnd(date) {
  const value = normalizeDate(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function createAttendanceDocument({ staffId, adminId, date }) {
  return {
    staff: staffId,
    admin: adminId,
    date: getDayStart(date),
    sessions: [],
    totalHours: 0,
    overtimeHours: 0,
    status: 'incomplete',
    workStatus: 'Active',
    tasks: [],
    notes: ''
  };
}

function computeSessionHours(startTime, endTime) {
  const start = normalizeDate(startTime);
  const end = normalizeDate(endTime);
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
}

function determineWorkStatus(totalHours) {
  if (totalHours >= FULL_DAY_THRESHOLD) return 'Full Day';
  if (totalHours >= HALF_DAY_THRESHOLD) return 'Half Day';
  return 'LOP';
}

/**
 * Build a point-in-time snapshot of an attendance record.
 *
 * CRITICAL SAFETY RULE:
 *   If the active session belongs to a PAST day, cap its contribution at
 *   23:59:59 IST of the record's own date — never compute hours up to
 *   referenceTime (which could be hours/days/weeks later).
 *
 *   Past-day detection uses UTC midnight (getDayStart) which is the same
 *   format used for attendance.date storage — keeping DB queries correct.
 *
 *   The cap itself uses getISTDayEnd to ensure 11:59 PM IST is the
 *   boundary, not 05:29 AM IST the next day.
 */
function buildAttendanceSnapshot(attendance, referenceTime = new Date()) {
  const sessions = Array.isArray(attendance.sessions) ? attendance.sessions : [];
  const completedSessions = sessions.filter(session => session && session.endTime && !session.isActive);
  const activeSession = sessions.find(session => session && session.isActive);

  // ── Past-day guard ─────────────────────────────────────────────────────────
  let liveHours = 0;
  if (activeSession) {
    const todayStart = getDayStart(new Date(referenceTime));   // UTC midnight today
    const recordDate = attendance.date ? getDayStart(new Date(attendance.date)) : null;
    const isPastDay  = recordDate && recordDate.getTime() < todayStart.getTime();

    if (isPastDay && attendance.date) {
      // Cap at IST 23:59:59 of the record's own date (NOT UTC 23:59:59)
      const istDayEnd   = getISTDayEnd(new Date(attendance.date));
      const sessionStart = new Date(activeSession.startTime);
      const capTime = istDayEnd > sessionStart ? istDayEnd : sessionStart;
      liveHours = computeSessionHours(sessionStart, capTime);
    } else {
      // Today's active session — compute live duration
      liveHours = computeSessionHours(activeSession.startTime, referenceTime);
    }
  }

  const closedHours = completedSessions.reduce((sum, session) => sum + (session.durationHours || 0), 0);
  const totalWithLive = parseFloat((closedHours + liveHours).toFixed(2));
  const remainingHours = parseFloat(Math.max(0, DEFAULT_STANDARD_HOURS - totalWithLive).toFixed(2));
  const sessionCount = completedSessions.length + (activeSession ? 1 : 0);

  return {
    sessions,
    completedSessions,
    activeSession,
    sessionCount,
    totalHours: totalWithLive,
    remainingHours,
    workStatus: determineWorkStatus(totalWithLive),
    status: totalWithLive >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete'
  };
}

function startAttendanceSession(attendance, { startTime = new Date(), tasks = [] } = {}) {
  if (!attendance) {
    throw new Error('Attendance record is required');
  }
  const snapshot = buildAttendanceSnapshot(attendance, normalizeDate(startTime));
  if (snapshot.activeSession) {
    return {
      success: false,
      message: 'An active attendance session already exists. Please punch out before starting a new session.'
    };
  }

  const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map(task => ({
    project: (task.project || '').trim(),
    description: (task.description || '').trim(),
    status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
    notes: (task.notes || '').trim()
  }));

  if (normalizedTasks.some(task => !task.project)) {
    return { success: false, message: 'Please select a project.' };
  }
  if (normalizedTasks.some(task => !task.description)) {
    return { success: false, message: 'Please add at least one task before Punch In.' };
  }

  attendance.sessions.push({
    startTime: normalizeDate(startTime),
    endTime: null,
    durationHours: 0,
    isActive: true,
    source: 'MANUAL',
    reason: 'Manual punch in',
    tasks: normalizedTasks
  });
  attendance.tasks = normalizedTasks;
  attendance.status = 'incomplete';
  attendance.workStatus = 'Active';

  return {
    success: true,
    message: 'Punched in successfully',
    session: attendance.sessions[attendance.sessions.length - 1],
    snapshot: buildAttendanceSnapshot(attendance, normalizeDate(startTime))
  };
}

function closeAttendanceSession(attendance, { endTime = new Date(), source = 'MANUAL', reason = 'Manual punch out' } = {}) {
  if (!attendance) {
    throw new Error('Attendance record is required');
  }
  const normalizedEndTime = normalizeDate(endTime);
  const activeSession = Array.isArray(attendance.sessions)
    ? attendance.sessions.find(session => session && session.isActive)
    : null;

  if (!activeSession) {
    return {
      success: false,
      message: 'No active attendance session found. Please punch in before punching out.'
    };
  }

  const durationHours = computeSessionHours(activeSession.startTime, normalizedEndTime);
  activeSession.endTime = normalizedEndTime;
  activeSession.durationHours = parseFloat(durationHours.toFixed(2));
  activeSession.isActive = false;
  activeSession.source = source || 'MANUAL';
  activeSession.reason = reason || 'Manual punch out';

  const completedSessions = attendance.sessions.filter(session => session && !session.isActive && session.endTime);
  attendance.totalHours = parseFloat(completedSessions.reduce((sum, session) => sum + (session.durationHours || 0), 0).toFixed(2));
  attendance.overtimeHours = Math.max(0, parseFloat((attendance.totalHours - DEFAULT_STANDARD_HOURS).toFixed(2)));
  attendance.workStatus = determineWorkStatus(attendance.totalHours);
  attendance.status = attendance.totalHours >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete';
  attendance.punchOutSource = source || 'MANUAL';
  attendance.notes = attendance.notes || '';

  return {
    success: true,
    message: 'Punched out successfully',
    session: activeSession,
    snapshot: buildAttendanceSnapshot(attendance, normalizedEndTime)
  };
}

/**
 * Auto-close a stale open attendance record.
 *
 * Sets punchOut to 23:59:59 IST on the record's OWN date (never "now"),
 * recalculates totalHours / overtimeHours / workStatus / status,
 * and closes any active sessions in the sessions[] array.
 *
 * ── TIMEZONE FIX ───────────────────────────────────────────────────────────
 * Previously this used UTC 23:59:59 which = IST 05:29:59 AM the next day.
 * Now uses getISTDayEnd() which correctly returns IST 23:59:59 = UTC 18:29:59.
 *
 * Validation:
 *   08:06 AM IST → 11:59 PM IST = 15h 53m ✅
 *   03:07 PM IST → 07:00 PM IST = 03h 53m ✅
 *   10:09 AM IST → 11:59 PM IST = 13h 50m ✅
 *   04:40 PM IST → 11:59 PM IST = 07h 19m ✅
 */
function autoCloseStaleAttendance(attendance) {
  if (!attendance || !attendance.punchIn) {
    return { fixed: false, autoPunchOut: null };
  }

  // Compute 23:59:59 IST on the record's own IST calendar date
  const autoPunchOut = getISTDayEnd(new Date(attendance.date));

  // punchIn must not be after autoPunchOut (edge case guard)
  const effectivePunchIn = new Date(attendance.punchIn);
  const effectiveEnd = autoPunchOut > effectivePunchIn ? autoPunchOut : effectivePunchIn;

  // Close any active sessions at IST day-end
  if (Array.isArray(attendance.sessions)) {
    for (const session of attendance.sessions) {
      if (session && session.isActive) {
        const sessionStart = new Date(session.startTime);
        const sessionEnd = effectiveEnd > sessionStart ? effectiveEnd : sessionStart;
        session.endTime = sessionEnd;
        session.durationHours = parseFloat(
          computeSessionHours(sessionStart, sessionEnd).toFixed(2)
        );
        session.isActive = false;
        session.source = 'AUTO_PUNCH_OUT';
        session.reason = 'System: Auto punch-out at 11:59 PM IST — no manual punch-out recorded';
      }
    }
  }

  // Recompute totalHours from all closed sessions (or fall back to punchIn→end)
  const closedSessions = Array.isArray(attendance.sessions)
    ? attendance.sessions.filter(s => s && !s.isActive && s.endTime)
    : [];

  let totalHours;
  if (closedSessions.length > 0) {
    totalHours = parseFloat(
      closedSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(2)
    );
  } else {
    totalHours = parseFloat(computeSessionHours(effectivePunchIn, effectiveEnd).toFixed(2));
  }

  // Cap at 23.99h — a single IST day cannot have more hours than this
  totalHours = Math.min(totalHours, 23.99);

  attendance.punchOut      = effectiveEnd;
  attendance.totalHours    = totalHours;
  attendance.overtimeHours = Math.max(0, parseFloat((totalHours - DEFAULT_STANDARD_HOURS).toFixed(2)));
  attendance.workStatus    = determineWorkStatus(totalHours);
  attendance.status        = totalHours >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete';
  attendance.punchOutSource = 'AUTO_PUNCH_OUT';
  attendance.lastAutoPunchOutAt     = effectiveEnd;
  attendance.lastAutoPunchOutReason = 'System: Auto punch-out at 11:59 PM IST — no manual punch-out recorded';

  return { fixed: true, autoPunchOut: effectiveEnd };
}

module.exports = {
  DEFAULT_STANDARD_HOURS,
  FULL_DAY_THRESHOLD,
  HALF_DAY_THRESHOLD,
  IST_OFFSET_MS,
  // IST helpers
  getISTDayStart,
  getISTDayEnd,
  getISTDayOfWeek,
  // UTC helpers (for DB queries)
  getDayStart,
  getDayEnd,
  // Attendance logic
  createAttendanceDocument,
  computeSessionHours,
  determineWorkStatus,
  buildAttendanceSnapshot,
  startAttendanceSession,
  closeAttendanceSession,
  autoCloseStaleAttendance,
  normalizeDate,
};

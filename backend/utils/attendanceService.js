const DEFAULT_STANDARD_HOURS = 8;
const FULL_DAY_THRESHOLD = 8;
const HALF_DAY_THRESHOLD = 4;

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date;
}

function getDayStart(date) {
  const value = normalizeDate(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

/**
 * Returns 23:59:59.999 UTC on the given date.
 * Used as the maximum cap for any attendance record on that date.
 */
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
 *   If the active session belongs to a PAST day (i.e., the record's `date`
 *   is before today in UTC), we must NOT compute live hours up to `referenceTime`
 *   (which could be hours/days/weeks later). Instead we cap the active session
 *   at 23:59:59 of the record's own date — just like autoCloseStaleAttendance.
 *
 *   This prevents the infamous 163h / 285h / 462h values from ever being
 *   written to MongoDB or returned in API responses.
 *
 * @param {Object} attendance    - Mongoose attendance document
 * @param {Date}   referenceTime - The "now" reference (defaults to actual now)
 */
function buildAttendanceSnapshot(attendance, referenceTime = new Date()) {
  const sessions = Array.isArray(attendance.sessions) ? attendance.sessions : [];
  const completedSessions = sessions.filter(session => session && session.endTime && !session.isActive);
  const activeSession = sessions.find(session => session && session.isActive);

  // ── Past-day guard ───────────────────────────────────────────────────────
  // If the attendance record belongs to a previous calendar day, any "active"
  // session is stale. We cap its contribution at the end of that day rather
  // than computing from startTime → referenceTime (which would span days).
  let liveHours = 0;
  if (activeSession) {
    const recordDayEnd = attendance.date
      ? getDayEnd(new Date(attendance.date))
      : null;

    const todayStart = getDayStart(new Date(referenceTime));
    const recordDate = attendance.date ? getDayStart(new Date(attendance.date)) : null;
    const isPastDay = recordDate && recordDate.getTime() < todayStart.getTime();

    if (isPastDay && recordDayEnd) {
      // Cap at end of the record's own day — never let it bleed into today
      const sessionStart = new Date(activeSession.startTime);
      const capTime = recordDayEnd > sessionStart ? recordDayEnd : sessionStart;
      liveHours = computeSessionHours(sessionStart, capTime);
    } else {
      // Normal case: today's active session — compute live duration
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
 * Sets punchOut to 23:59:59 on the record's OWN date (never "now"),
 * recalculates totalHours / overtimeHours / workStatus / status,
 * and closes any active sessions in the sessions[] array.
 *
 * This is the canonical fix for records that were never punched out —
 * worked hours are always bounded by midnight of the attendance date.
 *
 * @param {Object} attendance  - Mongoose attendance document (mutable)
 * @returns {{ fixed: boolean, autoPunchOut: Date }}
 */
function autoCloseStaleAttendance(attendance) {
  if (!attendance || !attendance.punchIn) {
    return { fixed: false, autoPunchOut: null };
  }

  // Compute 23:59:59 UTC on the record's own date
  const recordDate = new Date(attendance.date);
  const autoPunchOut = new Date(Date.UTC(
    recordDate.getUTCFullYear(),
    recordDate.getUTCMonth(),
    recordDate.getUTCDate(),
    23, 59, 59, 0
  ));

  // punchIn must not be after autoPunchOut (guard for edge cases)
  const effectivePunchIn = new Date(attendance.punchIn);
  const effectiveEnd = autoPunchOut > effectivePunchIn ? autoPunchOut : effectivePunchIn;

  // Close any active sessions
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
        session.reason = 'System: Auto punch-out at 11:59:59 PM — no manual punch-out recorded';
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

  // Cap totalHours at 23.99 — a single day can never have more than ~24h
  totalHours = Math.min(totalHours, 23.99);

  attendance.punchOut      = effectiveEnd;
  attendance.totalHours    = totalHours;
  attendance.overtimeHours = Math.max(0, parseFloat((totalHours - DEFAULT_STANDARD_HOURS).toFixed(2)));
  attendance.workStatus    = determineWorkStatus(totalHours);
  attendance.status        = totalHours >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete';
  attendance.lastAutoPunchOutAt     = effectiveEnd;
  attendance.lastAutoPunchOutReason = 'System: Auto punch-out at 11:59:59 PM — no manual punch-out recorded';

  return { fixed: true, autoPunchOut: effectiveEnd };
}

module.exports = {
  DEFAULT_STANDARD_HOURS,
  FULL_DAY_THRESHOLD,
  HALF_DAY_THRESHOLD,
  createAttendanceDocument,
  computeSessionHours,
  determineWorkStatus,
  buildAttendanceSnapshot,
  startAttendanceSession,
  closeAttendanceSession,
  autoCloseStaleAttendance,
  getDayStart,
  getDayEnd,
};

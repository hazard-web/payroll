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

function buildAttendanceSnapshot(attendance, referenceTime = new Date()) {
  const sessions = Array.isArray(attendance.sessions) ? attendance.sessions : [];
  const completedSessions = sessions.filter(session => session && session.endTime && !session.isActive);
  const activeSession = sessions.find(session => session && session.isActive);
  const totalHours = completedSessions.reduce((sum, session) => sum + (session.durationHours || 0), 0);
  const liveHours = activeSession
    ? computeSessionHours(activeSession.startTime, referenceTime)
    : 0;
  const totalWithLive = parseFloat((totalHours + liveHours).toFixed(2));
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
  getDayStart
};

const test = require('node:test');
const assert = require('node:assert/strict');

const { createAttendanceDocument, startAttendanceSession, closeAttendanceSession, buildAttendanceSnapshot } = require('../utils/attendanceService');

test('allows multiple sessions in one day and aggregates total hours', () => {
  const attendance = createAttendanceDocument({
    staffId: '507f1f77bcf86cd799439011',
    adminId: '507f1f77bcf86cd799439012',
    date: new Date('2026-07-01T00:00:00.000Z')
  });

  const firstPunchIn = new Date('2026-07-01T09:00:00.000Z');
  const firstPunchOut = new Date('2026-07-01T13:00:00.000Z');
  const secondPunchIn = new Date('2026-07-01T14:00:00.000Z');
  const secondPunchOut = new Date('2026-07-01T18:00:00.000Z');

  const first = startAttendanceSession(attendance, { startTime: firstPunchIn, tasks: [] });
  assert.equal(first.success, true);
  const closedFirst = closeAttendanceSession(attendance, { endTime: firstPunchOut, source: 'MANUAL', reason: 'Manual punch out' });
  assert.equal(closedFirst.success, true);

  const second = startAttendanceSession(attendance, { startTime: secondPunchIn, tasks: [] });
  assert.equal(second.success, true);
  const closedSecond = closeAttendanceSession(attendance, { endTime: secondPunchOut, source: 'MANUAL', reason: 'Manual punch out' });
  assert.equal(closedSecond.success, true);

  const snapshot = buildAttendanceSnapshot(attendance, secondPunchOut);
  assert.equal(snapshot.sessionCount, 2);
  assert.equal(snapshot.totalHours, 8);
  assert.equal(snapshot.workStatus, 'Full Day');
});

test('auto punch out records a system-generated session and keeps audit metadata', () => {
  const attendance = createAttendanceDocument({
    staffId: '507f1f77bcf86cd799439011',
    adminId: '507f1f77bcf86cd799439012',
    date: new Date('2026-07-01T00:00:00.000Z')
  });

  const started = startAttendanceSession(attendance, { startTime: new Date('2026-07-01T09:00:00.000Z'), tasks: [] });
  assert.equal(started.success, true);

  const closed = closeAttendanceSession(attendance, {
    endTime: new Date('2026-07-01T17:00:00.000Z'),
    source: 'AUTO_PUNCH_OUT',
    reason: 'Auto punch out at end of day'
  });

  assert.equal(closed.success, true);
  assert.equal(attendance.sessions[0].source, 'AUTO_PUNCH_OUT');
  assert.equal(attendance.sessions[0].reason, 'Auto punch out at end of day');
  assert.equal(attendance.sessions[0].isActive, false);
  assert.equal(buildAttendanceSnapshot(attendance).workStatus, 'Full Day');
});

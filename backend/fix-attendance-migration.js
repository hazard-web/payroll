/**
 * fix-attendance-migration.js
 * ──────────────────────────
 * One-time migration script: fixes all corrupted attendance records.
 *
 * Pass 1 — Open records (punchOut null or sessions.isActive = true):
 *           Auto-close at 23:59:59 of the record's own date.
 *
 * Pass 2 — Inflated records (punchOut set but totalHours > 23.99):
 *           Recalculate from stored punchIn → punchOut, capped at day-end.
 *
 * Run: node fix-attendance-migration.js
 */

'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set in .env');
  process.exit(1);
}

// ── Inline helpers (mirrors attendanceService.js) ─────────────────────────────
const DEFAULT_STANDARD_HOURS = 8;

function getDayEnd(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 0);
  return d;
}

function computeSessionHours(startTime, endTime) {
  const ms = Math.max(0, new Date(endTime) - new Date(startTime));
  return parseFloat((ms / 3600000).toFixed(2));
}

function determineWorkStatus(h) {
  if (h >= 8) return 'Full Day';
  if (h >= 4) return 'Half Day';
  return 'LOP';
}

function autoCloseRecord(record) {
  if (!record.punchIn) return false;

  const recordDate = new Date(record.date);
  const autoPunchOut = getDayEnd(recordDate);
  const punchInDate  = new Date(record.punchIn);
  const effectiveEnd = autoPunchOut > punchInDate ? autoPunchOut : punchInDate;

  // Close active sessions
  if (Array.isArray(record.sessions)) {
    for (const s of record.sessions) {
      if (s && s.isActive) {
        const sStart = new Date(s.startTime);
        const sEnd   = effectiveEnd > sStart ? effectiveEnd : sStart;
        s.endTime       = sEnd;
        s.durationHours = computeSessionHours(sStart, sEnd);
        s.isActive      = false;
        s.source        = 'AUTO_PUNCH_OUT';
        s.reason        = 'System: Migration — auto punch-out at 11:59:59 PM.';
      }
    }
  }

  // Recompute totalHours
  const closed = Array.isArray(record.sessions)
    ? record.sessions.filter(s => s && !s.isActive && s.endTime)
    : [];

  let totalHours = closed.length > 0
    ? parseFloat(closed.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(2))
    : computeSessionHours(punchInDate, effectiveEnd);

  totalHours = Math.min(totalHours, 23.99);

  record.punchOut      = effectiveEnd;
  record.totalHours    = totalHours;
  record.overtimeHours = Math.max(0, parseFloat((totalHours - DEFAULT_STANDARD_HOURS).toFixed(2)));
  record.workStatus    = determineWorkStatus(totalHours);
  record.status        = totalHours >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete';
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ── PASS 1: Open records (no punchOut or still active sessions) ──────────
  console.log('🔍 Pass 1 — Finding open/unclosed past-day records...');
  const openRecords = await Attendance.find({
    date: { $lt: today },
    $or: [
      { punchOut: null },
      { punchOut: { $exists: false } },
      { 'sessions.isActive': true }
    ]
  }).lean();

  console.log(`   Found ${openRecords.length} open records\n`);

  let pass1Fixed = 0;
  for (const raw of openRecords) {
    const fixed = autoCloseRecord(raw);
    if (!fixed) continue;

    const note = 'System: Migration — auto punch-out at 11:59:59 PM. Previous data had no punch-out recorded.';
    const existingNotes1 = raw.notes || '';
    await Attendance.updateOne({ _id: raw._id }, {
      $set: {
        punchOut:       raw.punchOut,
        totalHours:     raw.totalHours,
        overtimeHours:  raw.overtimeHours,
        workStatus:     raw.workStatus,
        status:         raw.status,
        sessions:       raw.sessions,
        lastAutoPunchOutAt:     raw.punchOut,
        lastAutoPunchOutReason: 'System: Migration auto punch-out at 11:59:59 PM.',
        notes: existingNotes1 ? existingNotes1 + ' | ' + note : note,
      }
    });
    pass1Fixed++;
    console.log(`   ✓ [Pass 1] Fixed: ${new Date(raw.date).toISOString().split('T')[0]} | ${raw.totalHours}h | ${raw.workStatus}`);
  }

  // ── PASS 2: Inflated records (punchOut exists but totalHours > 23.99) ────
  console.log(`\n🔍 Pass 2 — Finding inflated-hours records (totalHours > 23.99)...`);
  const inflatedRecords = await Attendance.find({
    date: { $lt: today },
    punchOut: { $ne: null, $exists: true },
    totalHours: { $gt: 23.99 }
  }).lean();

  console.log(`   Found ${inflatedRecords.length} inflated records\n`);

  let pass2Fixed = 0;
  for (const raw of inflatedRecords) {
    if (!raw.punchIn || !raw.punchOut) continue;

    const recordDayEnd   = getDayEnd(new Date(raw.date));
    const storedPunchOut = new Date(raw.punchOut);
    const effectivePO    = storedPunchOut <= recordDayEnd ? storedPunchOut : recordDayEnd;

    // Recompute session durations
    if (Array.isArray(raw.sessions)) {
      for (const s of raw.sessions) {
        if (!s.endTime) {
          s.endTime   = recordDayEnd;
          s.isActive  = false;
          s.source    = 'AUTO_PUNCH_OUT';
          s.reason    = 'System: Migration fix — session closed at day end.';
        }
        const sEnd   = new Date(s.endTime) <= recordDayEnd ? new Date(s.endTime) : recordDayEnd;
        const sStart = new Date(s.startTime);
        s.durationHours = computeSessionHours(sStart, sEnd);
      }
    }

    const closed = Array.isArray(raw.sessions)
      ? raw.sessions.filter(s => s && !s.isActive && s.endTime)
      : [];

    let corrected = closed.length > 0
      ? parseFloat(closed.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(2))
      : computeSessionHours(new Date(raw.punchIn), effectivePO);

    corrected = Math.min(corrected, 23.99);

    const note = `System: Migration — corrected inflated totalHours from ${(raw.totalHours || 0).toFixed(1)}h to ${corrected.toFixed(2)}h.`;

    const existingNotes2 = raw.notes || '';
    await Attendance.updateOne({ _id: raw._id }, {
      $set: {
        punchOut:      effectivePO,
        totalHours:    corrected,
        overtimeHours: Math.max(0, parseFloat((corrected - DEFAULT_STANDARD_HOURS).toFixed(2))),
        workStatus:    determineWorkStatus(corrected),
        status:        corrected >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete',
        sessions:      raw.sessions,
        notes:         existingNotes2 ? existingNotes2 + ' | ' + note : note,
      }
    });
    pass2Fixed++;
    console.log(`   ✓ [Pass 2] Fixed: ${new Date(raw.date).toISOString().split('T')[0]} | ${(raw.totalHours||0).toFixed(1)}h → ${corrected.toFixed(2)}h | ${determineWorkStatus(corrected)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = pass1Fixed + pass2Fixed;
  console.log('\n' + '═'.repeat(55));
  console.log(`✅ Migration complete!`);
  console.log(`   Pass 1 (open records fixed):     ${pass1Fixed}`);
  console.log(`   Pass 2 (inflated hours fixed):   ${pass2Fixed}`);
  console.log(`   Total fixed:                     ${total}`);
  if (total === 0) {
    console.log('\n   ℹ  No records needed fixing — your data is already clean!');
  }
  console.log('═'.repeat(55) + '\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!\n');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});

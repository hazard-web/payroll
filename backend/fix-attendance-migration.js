/**
 * fix-attendance-migration.js  (v2 — IST-correct)
 * ─────────────────────────────────────────────────
 * Re-runs the migration with the correct IST timezone fix.
 *
 * Root cause fixed:
 *   Previously used UTC 23:59:59 as the auto-close boundary.
 *   UTC 23:59:59 = IST 05:29:59 AM next day → punch-outs showed "05:29 AM".
 *   Now uses IST 23:59:59 = UTC 18:29:59 → punch-outs correctly show "11:59 PM".
 *
 * Validation:
 *   08:06 AM IST → 11:59 PM IST = 15h 53m ✅
 *   03:07 PM IST → 07:00 PM IST = 03h 53m ✅
 *   10:09 AM IST → 11:59 PM IST = 13h 50m ✅
 *   04:40 PM IST → 11:59 PM IST = 07h 19m ✅
 *
 * Pass 1 — Open records (punchOut null or sessions.isActive = true):
 *           Auto-close at IST 23:59:59 (= UTC 18:29:59) of the record's date.
 *
 * Pass 2 — Inflated records (punchOut set but totalHours > 23.99):
 *           Recalculate from stored punchIn → punchOut, capped at IST day-end.
 *
 * Pass 3 — Previously-migrated records with wrong UTC boundary (05:29 AM IST):
 *           Detects punchOut between UTC 18:30:00 and UTC 23:59:59 on past days,
 *           corrects to IST 23:59:59 (UTC 18:29:59) and recalculates hours.
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

// ── IST helpers (mirrors attendanceService.js) ────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

function getISTDayEnd(utcDate) {
  const d = new Date(utcDate);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    23, 59, 59, 0
  ) - IST_OFFSET_MS);
  // e.g. July 13 00:00 UTC → IST July 13 05:30 → IST 23:59:59 → July 13 18:29:59 UTC
}

const DEFAULT_STANDARD_HOURS = 8;

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

  const autoPunchOut   = getISTDayEnd(new Date(record.date));
  const punchInDate    = new Date(record.punchIn);
  const effectiveEnd   = autoPunchOut > punchInDate ? autoPunchOut : punchInDate;

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
        s.reason        = 'System: Migration v2 — auto punch-out at IST 11:59 PM.';
      }
    }
  }

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

  // ── PASS 1: Open records (no punchOut or still active sessions) ───────────
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

    const note = `System: Migration v2 — auto punch-out at IST 11:59 PM (${new Date(raw.punchOut).toISOString()}). Previous data had no punch-out recorded.`;
    const existingNotes = raw.notes || '';
    await Attendance.updateOne({ _id: raw._id }, {
      $set: {
        punchOut:       raw.punchOut,
        totalHours:     raw.totalHours,
        overtimeHours:  raw.overtimeHours,
        workStatus:     raw.workStatus,
        status:         raw.status,
        sessions:       raw.sessions,
        notes:          existingNotes ? existingNotes + ' | ' + note : note,
      }
    });
    pass1Fixed++;
    console.log(`   ✓ [Pass 1] ${new Date(raw.date).toISOString().split('T')[0]} | ${raw.totalHours}h | ${raw.workStatus} | PO: ${new Date(raw.punchOut).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  }

  // ── PASS 2: Inflated records (punchOut exists but totalHours > 23.99) ─────
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

    const recordDayEnd   = getISTDayEnd(new Date(raw.date));
    const storedPunchOut = new Date(raw.punchOut);
    const effectivePO    = storedPunchOut <= recordDayEnd ? storedPunchOut : recordDayEnd;

    if (Array.isArray(raw.sessions)) {
      for (const s of raw.sessions) {
        if (!s.endTime) {
          s.endTime = recordDayEnd; s.isActive = false;
          s.source = 'AUTO_PUNCH_OUT';
          s.reason = 'System: Migration v2 fix — session closed at IST day end.';
        }
        const sEnd = new Date(s.endTime) <= recordDayEnd ? new Date(s.endTime) : recordDayEnd;
        s.durationHours = computeSessionHours(new Date(s.startTime), sEnd);
      }
    }

    const closed = Array.isArray(raw.sessions)
      ? raw.sessions.filter(s => s && !s.isActive && s.endTime)
      : [];

    let corrected = closed.length > 0
      ? parseFloat(closed.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(2))
      : computeSessionHours(new Date(raw.punchIn), effectivePO);

    corrected = Math.min(corrected, 23.99);

    const note = `System: Migration v2 — corrected inflated totalHours from ${(raw.totalHours || 0).toFixed(1)}h to ${corrected.toFixed(2)}h.`;
    const existingNotes = raw.notes || '';
    await Attendance.updateOne({ _id: raw._id }, {
      $set: {
        punchOut:      effectivePO,
        totalHours:    corrected,
        overtimeHours: Math.max(0, parseFloat((corrected - DEFAULT_STANDARD_HOURS).toFixed(2))),
        workStatus:    determineWorkStatus(corrected),
        status:        corrected >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete',
        sessions:      raw.sessions,
        notes:         existingNotes ? existingNotes + ' | ' + note : note,
      }
    });
    pass2Fixed++;
    console.log(`   ✓ [Pass 2] ${new Date(raw.date).toISOString().split('T')[0]} | ${(raw.totalHours||0).toFixed(1)}h → ${corrected.toFixed(2)}h | PO: ${effectivePO.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  }

  // ── PASS 3: Fix previously-migrated records with wrong UTC boundary ────────
  // Old migration used UTC 23:59:59 → IST 05:29:59 AM next day.
  // Detect: punchOut between UTC 18:30:00 and UTC 23:59:59 on a PAST day
  // (IST 00:00 to 05:29 AM = clearly a wrong auto-close, not a real punch-out)
  console.log(`\n🔍 Pass 3 — Fixing records with wrong UTC boundary (punchOut shows ~05:29 AM IST)...`);

  // For each past-day attendance, check if punchOut is in the UTC 18:30–23:59 range
  // which corresponds to IST 00:00–05:29 of the NEXT day — an impossible real punch-out
  const allPastRecords = await Attendance.find({
    date: { $lt: today },
    punchOut: { $ne: null, $exists: true }
  }).lean();

  let pass3Fixed = 0;
  for (const raw of allPastRecords) {
    if (!raw.punchOut || !raw.date) continue;

    const correctDayEnd = getISTDayEnd(new Date(raw.date));
    const storedPO      = new Date(raw.punchOut);

    // Is the stored punchOut AFTER the correct IST day-end AND on the same UTC date?
    // i.e., between UTC 18:30:00 and UTC 23:59:59 of the attendance date
    // This is the signature of the old wrong auto-close.
    const attendanceDateUTC = new Date(raw.date);
    attendanceDateUTC.setUTCHours(0, 0, 0, 0);
    const wrongBoundaryStart = new Date(attendanceDateUTC.getTime() + (18 * 60 + 30) * 60 * 1000); // UTC 18:30 same day
    const wrongBoundaryEnd   = new Date(attendanceDateUTC.getTime() + 24 * 60 * 60 * 1000 - 1);   // UTC 23:59:59.999

    if (storedPO >= wrongBoundaryStart && storedPO <= wrongBoundaryEnd) {
      // This punchOut is in the wrong-UTC-boundary zone — fix it
      const newPunchOut = correctDayEnd; // IST 23:59:59

      // Recalculate from punchIn → new punchOut
      if (!raw.punchIn) continue;
      const punchInDate = new Date(raw.punchIn);
      const correctedHours = Math.min(
        computeSessionHours(punchInDate, newPunchOut),
        23.99
      );

      // Fix sessions too
      if (Array.isArray(raw.sessions)) {
        for (const s of raw.sessions) {
          if (!s.endTime) continue;
          const sEnd = new Date(s.endTime);
          if (sEnd >= wrongBoundaryStart && sEnd <= wrongBoundaryEnd) {
            s.endTime = newPunchOut;
            s.durationHours = computeSessionHours(new Date(s.startTime), newPunchOut);
          }
        }
      }

      const note = `System: Migration v3 — corrected wrong UTC punchOut (${storedPO.toISOString()}) to IST 11:59 PM (${newPunchOut.toISOString()}). totalHours: ${(raw.totalHours||0).toFixed(2)}h → ${correctedHours.toFixed(2)}h.`;
      const existingNotes = raw.notes || '';
      await Attendance.updateOne({ _id: raw._id }, {
        $set: {
          punchOut:      newPunchOut,
          totalHours:    correctedHours,
          overtimeHours: Math.max(0, parseFloat((correctedHours - DEFAULT_STANDARD_HOURS).toFixed(2))),
          workStatus:    determineWorkStatus(correctedHours),
          status:        correctedHours >= DEFAULT_STANDARD_HOURS ? 'complete' : 'incomplete',
          sessions:      raw.sessions,
          notes:         existingNotes ? existingNotes + ' | ' + note : note,
        }
      });
      pass3Fixed++;
      const oldIST = storedPO.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const newIST = newPunchOut.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`   ✓ [Pass 3] ${new Date(raw.date).toISOString().split('T')[0]} | PO: ${oldIST} → ${newIST} | ${(raw.totalHours||0).toFixed(2)}h → ${correctedHours.toFixed(2)}h`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = pass1Fixed + pass2Fixed + pass3Fixed;
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Migration v2 complete!`);
  console.log(`   Pass 1 (open records fixed):          ${pass1Fixed}`);
  console.log(`   Pass 2 (inflated hours fixed):        ${pass2Fixed}`);
  console.log(`   Pass 3 (wrong UTC boundary fixed):    ${pass3Fixed}`);
  console.log(`   Total fixed:                          ${total}`);
  if (total === 0) {
    console.log('\n   ℹ  No records needed fixing — your data is already clean!');
  }
  console.log('═'.repeat(60) + '\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!\n');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});

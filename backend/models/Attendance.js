const mongoose = require('mongoose');

// ─── Task subdocument schema (reused for both sessions[].tasks and top-level tasks) ───
const taskSchema = new mongoose.Schema({
  project: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  },
  // ── Time tracking fields ──────────────────────────────────────────────────
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: null
  }
}, { _id: true });

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true
    }, // Store as 00:00:00 UTC for the given day
    punchIn: {
      type: Date,
      required: true,
    },
    punchOut: {
      type: Date,
    },
    punchOutSource: {
      type: String,
      enum: ['MANUAL', 'AUTO_PUNCH_OUT', 'SYSTEM'],
      default: 'MANUAL'
    },
    sessions: [{
      startTime: { type: Date, required: true },
      endTime: { type: Date },
      durationHours: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      source: { type: String, enum: ['MANUAL', 'AUTO_PUNCH_OUT', 'SYSTEM'], default: 'MANUAL' },
      reason: { type: String, default: 'Manual punch in' },
      tasks: [taskSchema]
    }],
    sessionCount: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['incomplete', 'complete', 'flagged'],
      default: 'incomplete',
    },
    workStatus: {
      type: String,
      enum: ['Full Day', 'Half Day', 'Absent', 'Leave', 'LOP', 'Active'],
      default: 'Full Day'
    },
    locationIn: {
      lat: Number,
      lng: Number
    },
    locationOut: {
      lat: Number,
      lng: Number
    },
    tasks: [taskSchema],
    notes: {
      type: String,
    },
    lastAutoPunchOutAt: {
      type: Date,
    },
    lastAutoPunchOutReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Attendance records are keyed by day, but staff may have multiple sessions
// within the same day, so this index is non-unique.
attendanceSchema.index({ staff: 1, date: 1 });
// Admin dashboard queries:
//  • { admin, status, punchIn } — flagged / stale-incomplete check (cron + admin dashboard)
//  • { admin, date } — admin daily view
//  • { staff, status, date } — staff personal history
attendanceSchema.index({ admin: 1, status: 1, punchIn: -1 });
attendanceSchema.index({ admin: 1, date: -1 });
attendanceSchema.index({ staff: 1, status: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

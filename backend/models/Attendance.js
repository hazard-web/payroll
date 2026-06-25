const mongoose = require('mongoose');

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
    tasks: [
      {
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
        }
      }
    ],
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Ensure only one attendance record per staff per day
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
// Admin dashboard queries:
//  • { admin, status, punchIn } — flagged / stale-incomplete check (cron + admin dashboard)
//  • { admin, date } — admin daily view
//  • { staff, status, date } — staff personal history
attendanceSchema.index({ admin: 1, status: 1, punchIn: -1 });
attendanceSchema.index({ admin: 1, date: -1 });
attendanceSchema.index({ staff: 1, status: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

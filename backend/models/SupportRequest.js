const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    },
    date: {
      type: Date,
      required: true
    },
    requestType: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    adminNote: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

// Hot paths:
//  • staff "my support" — { staff, createdAt }
//  • admin "all open" — { admin, status, createdAt }
supportRequestSchema.index({ staff: 1, createdAt: -1 });
supportRequestSchema.index({ admin: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);

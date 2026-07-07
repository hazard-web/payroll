const mongoose = require('mongoose');

const leaveAdjustmentSchema = new mongoose.Schema(
  {
    // Admin who made the adjustment
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Employee whose balance was adjusted
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['Casual', 'Sick'],
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ['Add', 'Deduct'],
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: [0.5, 'Minimum adjustment is 0.5 days'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required for every adjustment'],
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
    },
    // Snapshot of balance before and after for the audit trail
    balanceBefore: {
      casual: { type: Number, default: 0 },
      sick:   { type: Number, default: 0 },
    },
    balanceAfter: {
      casual: { type: Number, default: 0 },
      sick:   { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

leaveAdjustmentSchema.index({ admin: 1, createdAt: -1 });
leaveAdjustmentSchema.index({ staff: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveAdjustment', leaveAdjustmentSchema);

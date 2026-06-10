const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  }, // e.g., 'PAYSLIP_GENERATED', 'STAFF_CREATED', 'PORTAL_ACCESS_GRANTED'
  details: {
    type: String,
    required: true
  }, // Human readable description
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }, // Any related IDs or data
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);

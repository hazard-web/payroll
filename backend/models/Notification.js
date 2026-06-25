const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    recipientType: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'admin'
    },
    type: {
      type: String,
      enum: ['LEAVE_REQUEST', 'PROFILE_UPDATE', 'ATTENDANCE_ALERT', 'PAYSLIP_PUSHED', 'STAFF_CREATED', 'OTHER'],
      default: 'LEAVE_REQUEST'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Hot paths:
//  • staff portal "My Notifications" — { staff, isRead, createdAt } sort newest first
//  • admin bell — { admin, recipientType, isRead, createdAt }
//  • mark-as-read — needs fast lookup by _id which is the default _id index
notificationSchema.index({ staff: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ admin: 1, recipientType: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

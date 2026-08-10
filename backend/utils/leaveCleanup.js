const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const AssignedTask = require('../models/AssignedTask');
const LeaveAdjustment = require('../models/LeaveAdjustment');
const SupportRequest = require('../models/SupportRequest');

/**
 * Automatically deletes orphaned records (leaves, attendance, notifications, etc.)
 * for staff members who no longer exist in the database.
 */
async function autoCleanupOrphanedData() {
  try {
    // 1. Get all distinct staff IDs referenced in relevant collections
    const [
      leaveStaffIds,
      attendanceStaffIds,
      notificationStaffIds,
      taskStaffIds,
      adjustmentStaffIds,
      supportStaffIds
    ] = await Promise.all([
      LeaveRequest.distinct('staff'),
      Attendance.distinct('staff'),
      Notification.distinct('staff'),
      AssignedTask.distinct('staff'),
      LeaveAdjustment.distinct('staff'),
      SupportRequest.distinct('staff')
    ]);

    // Merge and deduplicate all referenced staff IDs
    const allReferencedStaffIds = [...new Set([
      ...leaveStaffIds,
      ...attendanceStaffIds,
      ...notificationStaffIds,
      ...taskStaffIds,
      ...adjustmentStaffIds,
      ...supportStaffIds
    ])].filter(Boolean);

    if (allReferencedStaffIds.length === 0) return;

    // 2. Query Staff collection to find which of these IDs actually exist
    const existingStaff = await Staff.find({ _id: { $in: allReferencedStaffIds } }).select('_id');
    const existingStaffIds = new Set(existingStaff.map(s => s._id.toString()));

    // 3. Find the missing (orphaned) staff IDs
    const missingStaffIds = allReferencedStaffIds.filter(id => !existingStaffIds.has(id.toString()));

    if (missingStaffIds.length > 0) {
      console.log(`[Orphan Cleanup] Found orphaned staff IDs:`, missingStaffIds);

      // 4. Cascade delete all orphaned documents in parallel
      const results = await Promise.all([
        LeaveRequest.deleteMany({ staff: { $in: missingStaffIds } }),
        Attendance.deleteMany({ staff: { $in: missingStaffIds } }),
        Notification.deleteMany({ staff: { $in: missingStaffIds } }),
        AssignedTask.deleteMany({ staff: { $in: missingStaffIds } }),
        LeaveAdjustment.deleteMany({ staff: { $in: missingStaffIds } }),
        SupportRequest.deleteMany({ staff: { $in: missingStaffIds } })
      ]);

      console.log(`[Orphan Cleanup] Deleted orphaned records:`, {
        leaves: results[0].deletedCount,
        attendances: results[1].deletedCount,
        notifications: results[2].deletedCount,
        tasks: results[3].deletedCount,
        adjustments: results[4].deletedCount,
        supports: results[5].deletedCount
      });
    }
  } catch (err) {
    console.error('Error during auto cleanup of orphaned data:', err);
  }
}

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Automatically deletes pending leave requests whose end dates have passed.
 * Also deletes any associated admin notifications to avoid broken reference links.
 * Also triggers the cleanup of any orphaned data for deleted employees.
 */
async function autoDeleteExpiredLeaves() {
  const nowTime = Date.now();
  if (nowTime - lastCleanupTime < CLEANUP_INTERVAL) {
    return; // Rate limit execution to at most once per 30 minutes
  }
  lastCleanupTime = nowTime;

  try {
    // 1. Run orphan cleanup first to ensure all references are correct
    await autoCleanupOrphanedData();

    // 2. Delete expired pending leaves
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today in local timezone

    // Find all pending leave requests where the endDate is before the start of today
    const expiredLeaves = await LeaveRequest.find({
      status: 'Pending',
      endDate: { $lt: todayStart }
    }).select('_id');

    if (expiredLeaves.length > 0) {
      const expiredIds = expiredLeaves.map(l => l._id);

      // Delete the expired leave requests
      const leaveDeleteResult = await LeaveRequest.deleteMany({
        _id: { $in: expiredIds }
      });

      // Delete any notifications referencing these leave requests
      const notifDeleteResult = await Notification.deleteMany({
        referenceId: { $in: expiredIds }
      });

      console.log(`[Auto-Delete] Cleaned up ${leaveDeleteResult.deletedCount} expired pending leave requests and ${notifDeleteResult.deletedCount} associated notifications.`);
    }
  } catch (err) {
    console.error('Error during auto-deleting expired leave requests:', err);
  }
}

module.exports = {
  autoDeleteExpiredLeaves,
  autoCleanupOrphanedData
};

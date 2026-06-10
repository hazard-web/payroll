const ActivityLog = require('../models/ActivityLog');

/**
 * Logs a system activity for a user
 * @param {string} userId - The ID of the admin user
 * @param {string} action - Action type (e.g., 'STAFF_CREATED')
 * @param {string} details - Human readable description
 * @param {object} metadata - Optional additional data
 */
const logActivity = async (userId, action, details, metadata = {}) => {
  try {
    const log = new ActivityLog({
      user: userId,
      action,
      details,
      metadata
    });
    await log.save();
    console.log(`[Audit] ${action}: ${details}`);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = { logActivity };

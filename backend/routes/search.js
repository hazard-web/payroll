const express = require('express');
const router = express.Router();
const { auth } = require('./auth');
const { staffAuth } = require('./staffPortal');
const Staff = require('../models/Staff');
const AssignedTask = require('../models/AssignedTask');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');

// Generic search handler that checks if user is Admin or Staff
router.get('/', async (req, res) => {
  try {
    const { q, portal } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const queryRegex = new RegExp(q, 'i');
    const results = [];

    if (portal === 'admin') {
      return auth(req, res, async () => {
        // 1. Search Staff
        const staffMembers = await Staff.find({
          user: req.user._id,
          $or: [
            { fullName: queryRegex },
            { email: queryRegex },
            { employeeId: queryRegex },
            { department: queryRegex },
            { designation: queryRegex }
          ]
        }).select('_id fullName email department type').lean();
        
        staffMembers.forEach(s => {
          results.push({
            id: s._id,
            type: 'Staff',
            title: s.fullName,
            subtitle: `${s.department || 'N/A'} • ${s.email}`,
            link: `/staff/${s._id}`
          });
        });

        const staffIds = await Staff.find({ user: req.user._id }).distinct('_id');

        // 2. Search Tasks
        const tasks = await AssignedTask.find({
          staff: { $in: staffIds },
          title: queryRegex
        }).populate('staff', 'fullName').lean();
        
        tasks.forEach(t => {
          results.push({
            id: t._id,
            type: 'Task',
            title: t.title,
            subtitle: `Assigned to: ${t.staff?.fullName || 'Unassigned'}`,
            link: `/tasks`
          });
        });

        // 3. Search Leaves
        const leaves = await LeaveRequest.find({
          admin: req.user._id,
          reason: queryRegex
        }).populate('staff', 'fullName').lean();
        
        leaves.forEach(l => {
          results.push({
            id: l._id,
            type: 'Leave',
            title: l.reason,
            subtitle: `Requested by: ${l.staff?.fullName || 'Unknown'}`,
            link: `/leave`
          });
        });

        // 4. Search Announcements
        const announcements = await Announcement.find({
          user: req.user._id,
          title: queryRegex
        }).lean();
        
        announcements.forEach(a => {
          results.push({
            id: a._id,
            type: 'Announcement',
            title: a.title,
            subtitle: a.message?.substring(0, 50) + (a.message?.length > 50 ? '...' : ''),
            link: `/announcements`
          });
        });
        
        res.json({ success: true, data: results });
      });

    } else if (portal === 'team') {
      return staffAuth(req, res, async () => {
        // 1. Search Tasks (assigned to them)
        const tasks = await AssignedTask.find({
          staff: req.staff._id,
          title: queryRegex
        }).lean();
        
        tasks.forEach(t => {
          results.push({
            id: t._id,
            type: 'Task',
            title: t.title,
            subtitle: t.description?.substring(0, 50) || 'Task details',
            link: `/portal/tasks`
          });
        });

        // 2. Search Leaves
        const leaves = await LeaveRequest.find({
          staff: req.staff._id,
          reason: queryRegex
        }).lean();
        
        leaves.forEach(l => {
          results.push({
            id: l._id,
            type: 'Leave',
            title: l.reason,
            subtitle: `Status: ${l.status}`,
            link: `/portal/leaves`
          });
        });

        // 3. Search Announcements
        const announcements = await Announcement.find({
          user: req.staff.user, // The admin's reference is in staff.user
          title: queryRegex
        }).lean();
        
        announcements.forEach(a => {
          results.push({
            id: a._id,
            type: 'Announcement',
            title: a.title,
            subtitle: a.message?.substring(0, 50) + (a.message?.length > 50 ? '...' : ''),
            link: `/portal/announcements`
          });
        });

        res.json({ success: true, data: results });
      });
    }

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

module.exports = router;

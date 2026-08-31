const express = require('express');
const router = express.Router();
const { auth: authAdmin } = require('./auth');
const { authStaff } = require('./staffPortal');
const AssignedTask = require('../models/AssignedTask');
const Staff = require('../models/Staff');
const { uploadBase64 } = require('../utils/cloudinary');

// GET /api/assigned-tasks/admin - Get all assigned tasks (for Admin)
router.get('/admin', authAdmin, async (req, res) => {
  try {
    const tasks = await AssignedTask.find()
      .populate('staff', 'fullName employeeId department designation documents.profileImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// POST /api/assigned-tasks/admin - Assign a new task (for Admin)
router.post('/admin', authAdmin, async (req, res) => {
  try {
    const { staffId, title, description, priority, dueDate, projectUrl, attachment } = req.body;
    if (!staffId || !title) {
      return res.status(400).json({ success: false, message: 'Staff and Title are required' });
    }
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    let taskAttachment = attachment;
    if (attachment && attachment.url && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinaryUrl = await uploadBase64(attachment.url, `payroll_portal/tasks/${staffId}`);
        taskAttachment = {
          ...attachment,
          url: cloudinaryUrl,
        };
      } catch (uploadErr) {
        return res.status(500).json({ success: false, message: `Cloudinary upload failed: ${uploadErr.message}` });
      }
    }

    const newTask = new AssignedTask({
      staff: staffId,
      title,
      description,
      projectUrl,
      attachment: taskAttachment,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });
    await newTask.save();
    
    const populated = await AssignedTask.findById(newTask._id)
      .populate('staff', 'fullName employeeId department designation documents.profileImage');
    
    res.status(201).json({ success: true, task: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign task' });
  }
});

// DELETE /api/assigned-tasks/admin/:id - Delete an assigned task (for Admin)
router.delete('/admin/:id', authAdmin, async (req, res) => {
  try {
    const task = await AssignedTask.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

// PATCH /api/assigned-tasks/admin/:id/status - Update assigned task status (for Admin)
router.patch('/admin/:id/status', authAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const updateData = { status };
    if (status === 'Accepted') updateData.acceptedAt = new Date();
    if (status === 'In Progress') updateData.startedAt = new Date();
    if (status === 'Completed') updateData.completedAt = new Date();

    const task = await AssignedTask.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('staff', 'fullName employeeId department designation documents.profileImage');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update task status' });
  }
});

// GET /api/assigned-tasks/staff - Get tasks assigned to the authenticated staff member
router.get('/staff', authStaff, async (req, res) => {
  try {
    const tasks = await AssignedTask.find({ staff: req.staff._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch assigned tasks' });
  }
});

// PATCH /api/assigned-tasks/staff/:id/status - Update assigned task status
router.patch('/staff/:id/status', authStaff, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const updateData = { status };
    if (status === 'Accepted') updateData.acceptedAt = new Date();
    if (status === 'In Progress') updateData.startedAt = new Date();
    if (status === 'Completed') updateData.completedAt = new Date();

    const task = await AssignedTask.findOneAndUpdate(
      { _id: req.params.id, staff: req.staff._id },
      { $set: updateData },
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or unauthorized' });
    }
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update task status' });
  }
});

module.exports = router;

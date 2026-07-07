const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { auth } = require('./auth');
const { logActivity } = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// GET /api/announcements — List all announcements for admin
// ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    console.error('Get announcements error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/announcements — Create a new announcement
// ─────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, priority, startDate, endDate, isActive } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Parse dates if provided as strings
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date' });
    }
    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end date' });
    }
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    const announcement = new Announcement({
      user: req.user._id,
      title: title.trim(),
      message: message.trim(),
      priority: priority || 'Normal',
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      isActive: isActive !== undefined ? isActive : true,
    });

    await announcement.save();

    await logActivity(
      req.user._id,
      'ANNOUNCEMENT_CREATED',
      `Created announcement: "${announcement.title}"`,
      { announcementId: announcement._id }
    );

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    console.error('Create announcement error:', err.message);
    if (err.name === 'ValidationError') {
      const fields = Object.values(err.errors).map((e) => e.message).join(' | ');
      return res.status(400).json({ success: false, message: fields || err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/announcements/:id — Update an announcement
// ─────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, message, priority, startDate, endDate, isActive } = req.body;

    const announcement = await Announcement.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (title !== undefined) announcement.title = title.trim();
    if (message !== undefined) announcement.message = message.trim();
    if (priority !== undefined) announcement.priority = priority;
    if (isActive !== undefined) announcement.isActive = isActive;

    if (startDate !== undefined) {
      announcement.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      announcement.endDate = endDate ? new Date(endDate) : null;
    }

    // Validate dates
    if (announcement.startDate && isNaN(announcement.startDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date' });
    }
    if (announcement.endDate && isNaN(announcement.endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end date' });
    }
    if (
      announcement.startDate &&
      announcement.endDate &&
      announcement.startDate > announcement.endDate
    ) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    await announcement.save();

    await logActivity(
      req.user._id,
      'ANNOUNCEMENT_UPDATED',
      `Updated announcement: "${announcement.title}"`,
      { announcementId: announcement._id }
    );

    res.json({ success: true, data: announcement });
  } catch (err) {
    console.error('Update announcement error:', err.message);
    if (err.name === 'ValidationError') {
      const fields = Object.values(err.errors).map((e) => e.message).join(' | ');
      return res.status(400).json({ success: false, message: fields || err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/announcements/:id — Delete an announcement
// ─────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const title = announcement.title;
    await Announcement.findByIdAndDelete(req.params.id);

    await logActivity(
      req.user._id,
      'ANNOUNCEMENT_DELETED',
      `Deleted announcement: "${title}"`,
      { announcementId: req.params.id }
    );

    res.json({ success: true, data: {} });
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/announcements/:id/toggle — Toggle active / inactive
// ─────────────────────────────────────────────────────────────
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    await logActivity(
      req.user._id,
      announcement.isActive ? 'ANNOUNCEMENT_ACTIVATED' : 'ANNOUNCEMENT_DEACTIVATED',
      `${announcement.isActive ? 'Activated' : 'Deactivated'} announcement: "${announcement.title}"`,
      { announcementId: announcement._id }
    );

    res.json({ success: true, data: announcement });
  } catch (err) {
    console.error('Toggle announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to toggle announcement' });
  }
});

module.exports = router;

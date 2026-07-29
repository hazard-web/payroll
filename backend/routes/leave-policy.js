const express = require('express');
const router  = express.Router();
const LeavePolicy      = require('../models/LeavePolicy');
const Staff            = require('../models/Staff');
const LeaveAdjustment  = require('../models/LeaveAdjustment');
const { auth }         = require('./auth');
const { logActivity }  = require('../utils/logger');

// ─── GET /api/leave-policy ─────────────────────────────────────────────────────
// Returns the policy document for the authenticated admin.
router.get('/', auth, async (req, res) => {
  try {
    let policy = await LeavePolicy.findOne({ user: req.user._id }).lean();
    if (!policy) {
      // Auto-create default policy on first access
      policy = await LeavePolicy.create({
        user: req.user._id,
        casualLeave: { daysPerMonth: 1, daysPerYear: 12, isPaid: true },
        sickLeave:   { daysPerMonth: 1, daysPerYear: 12, isPaid: true },
        lwp:         { enabled: true, salaryDeductionType: 'pro-rata' },
        workingDaysPerMonth: 26,
        weekendDays:  [0, 6],
        holidays:     [],
        autoResetAnnual: { enabled: true },
        probationPolicy: { allowsLeave: true, maxLeaveDuringProbation: 0 },
        carryForward: { enabled: false, maxDays: 0 },
        encashment:   { enabled: false, maxDays: 0 },
      });
    }
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('Get leave policy error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leave policy' });
  }
});

// ─── PUT /api/leave-policy ─────────────────────────────────────────────────────
// Admin creates or updates their leave policy.
router.put('/', auth, async (req, res) => {
  try {
    const updates = req.body; // partial update accepted
    const policy  = await LeavePolicy.findOneAndUpdate(
      { user: req.user._id },
      { $set: { ...updates, user: req.user._id } },
      { new: true, upsert: true, runValidators: true }
    );
    await logActivity(req.user._id, 'UPDATE_LEAVE_POLICY', 'Updated company leave policy');
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('Update leave policy error:', err);
    res.status(500).json({ success: false, message: 'Failed to update leave policy' });
  }
});

// ─── POST /api/leave-policy/reset ─────────────────────────────────────────────
// Reset annual leave balances for all staff under this admin.
router.post('/reset', auth, async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({ user: req.user._id });
    if (!policy) return res.status(404).json({ success: false, message: 'Leave policy not found' });

    const staffList = await Staff.find({ user: req.user._id }).select('_id').lean();
    const resetCL = policy.casualLeave.daysPerYear;
    const resetSL = policy.sickLeave.daysPerYear;

    const updates = staffList.map(s => ({
      updateOne: {
        filter: { _id: s._id },
        update: {
          $set: {
            'leaveBalance.casual': resetCL,
            'leaveBalance.sick':   resetSL,
          },
        },
      },
    }));

    if (updates.length > 0) await Staff.bulkWrite(updates);

    await logActivity(req.user._id, 'RESET_LEAVE_BALANCES',
      `Reset annual leave balances for ${staffList.length} staff members (CL: ${resetCL}, SL: ${resetSL})`);

    res.json({ success: true, message: `Balances reset for ${staffList.length} staff members`, cl: resetCL, sl: resetSL });
  } catch (err) {
    console.error('Reset leave balances error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset balances' });
  }
});

// ─── POST /api/leave-policy/reset/:staffId ────────────────────────────────────
// Reset annual leave balances for a specific staff member.
router.post('/reset/:staffId', auth, async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({ user: req.user._id });
    if (!policy) return res.status(404).json({ success: false, message: 'Leave policy not found' });

    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const resetCL = policy.casualLeave.daysPerYear;
    const resetSL = policy.sickLeave.daysPerYear;

    staff.leaveBalance.casual = resetCL;
    staff.leaveBalance.sick   = resetSL;
    await staff.save();

    await logActivity(req.user._id, 'RESET_LEAVE_BALANCE',
      `Reset leave balance for ${staff.fullName} (CL: ${resetCL}, SL: ${resetSL})`);

    res.json({ success: true, message: `Balance reset for ${staff.fullName}`, cl: resetCL, sl: resetSL });
  } catch (err) {
    console.error('Reset staff balance error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset balance' });
  }
});

// ─── GET /api/leave-policy/balances/:staffId ──────────────────────────────────
// Admin views leave balances for a specific staff member.
router.get('/balances/:staffId', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id })
      .select('fullName employeeId leaveBalance').lean();
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch balances' });
  }
});

// ─── POST /api/leave-policy/adjust/:staffId ───────────────────────────────────────
// Admin adjusts a staff member's leave balance (Add or Deduct).
// Creates a permanent LeaveAdjustment audit record.
router.post('/adjust/:staffId', auth, async (req, res) => {
  try {
    const { leaveType, adjustmentType, days, reason } = req.body;

    // --- Validation ---
    if (!['Casual', 'Sick'].includes(leaveType)) {
      return res.status(400).json({ success: false, message: 'leaveType must be Casual or Sick' });
    }
    if (!['Add', 'Deduct'].includes(adjustmentType)) {
      return res.status(400).json({ success: false, message: 'adjustmentType must be Add or Deduct' });
    }
    const numDays = Number(days);
    if (!numDays || numDays < 0.5) {
      return res.status(400).json({ success: false, message: 'Days must be at least 0.5' });
    }
    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Reason is required (min 3 characters)' });
    }

    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    // --- Snapshot before ---
    const balanceBefore = {
      casual: staff.leaveBalance.casual ?? 0,
      sick:   staff.leaveBalance.sick   ?? 0,
    };

    // --- Apply delta ---
    const field = leaveType === 'Casual' ? 'casual' : 'sick';
    if (adjustmentType === 'Add') {
      staff.leaveBalance[field] = (staff.leaveBalance[field] ?? 0) + numDays;
    } else {
      staff.leaveBalance[field] = (staff.leaveBalance[field] ?? 0) - numDays;
    }
    await staff.save();

    // --- Snapshot after ---
    const balanceAfter = {
      casual: staff.leaveBalance.casual,
      sick:   staff.leaveBalance.sick,
    };

    // --- Audit record ---
    const adjustment = await LeaveAdjustment.create({
      admin:          req.user._id,
      staff:          staff._id,
      leaveType,
      adjustmentType,
      days:           numDays,
      reason:         String(reason).trim(),
      balanceBefore,
      balanceAfter,
    });

    await logActivity(
      req.user._id,
      'LEAVE_BALANCE_ADJUSTED',
      `${adjustmentType}ed ${numDays} ${leaveType} leave day(s) for ${staff.fullName}. Reason: ${reason.trim()}`,
      { staffId: staff._id, adjustmentId: adjustment._id }
    );

    res.json({
      success: true,
      message: `${adjustmentType === 'Add' ? 'Added' : 'Deducted'} ${numDays} ${leaveType} day(s) for ${staff.fullName}`,
      data: { balance: staff.leaveBalance, adjustment },
    });
  } catch (err) {
    console.error('Leave adjust error:', err.message);
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(' | ');
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'Failed to adjust leave balance' });
  }
});

// Keep the old PUT route for backward compat (direct set) — no history recorded
// Admin manually adjusts a staff member's leave balance.
router.put('/balances/:staffId', auth, async (req, res) => {
  try {
    const { casual, sick } = req.body;
    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (typeof casual === 'number') staff.leaveBalance.casual = casual;
    if (typeof sick   === 'number') staff.leaveBalance.sick   = sick;
    await staff.save();

    await logActivity(req.user._id, 'ADJUST_LEAVE_BALANCE',
      `Adjusted leave balance for ${staff.fullName}: CL=${casual}, SL=${sick}`);

    res.json({ success: true, data: staff.leaveBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update balance' });
  }
});

// ─── GET /api/leave-policy/staff-balances ─────────────────────────────────────
// Admin views leave balances for all staff under them.
router.get('/staff-balances', auth, async (req, res) => {
  try {
    const staff = await Staff.find({ user: req.user._id })
      .select('fullName employeeId leaveBalance').sort({ fullName: 1 }).lean();
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch balances' });
  }
});

// ─── GET /api/leave-policy/adjustments ──────────────────────────────────────────────
// All adjustment history for this admin's company (newest first).
router.get('/adjustments', auth, async (req, res) => {
  try {
    // Collect all staff IDs belonging to this admin
    const staffIds = await Staff.distinct('_id', { user: req.user._id });
    const adjustments = await LeaveAdjustment.find({ staff: { $in: staffIds } })
      .populate('staff', 'fullName employeeId')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: adjustments });
  } catch (err) {
    console.error('Get adjustments error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch adjustment history' });
  }
});

// ─── GET /api/leave-policy/adjustments/:staffId ──────────────────────────────────────
// Adjustment history for a specific employee.
router.get('/adjustments/:staffId', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.staffId, user: req.user._id }).lean();
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const adjustments = await LeaveAdjustment.find({ staff: req.params.staffId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: adjustments, staff: { fullName: staff.fullName, leaveBalance: staff.leaveBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch adjustments' });
  }
});

module.exports = router;

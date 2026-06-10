const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Staff = require('../models/Staff');
const User = require('../models/User'); // Required to get company details if needed
const { sendPasswordResetEmail } = require('../utils/emailService');

// PAN validator
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const isValidPAN = (pan) => typeof pan === 'string' && PAN_REGEX.test(pan);

// Required fields for the employee self-service profile-completion form
const PROFILE_REQUIRED_FIELDS = [
  'panNumber',
  'dob',
  'gender',
  'address.street',
  'address.city',
  'address.state',
  'address.pincode',
  'emergencyContact.name',
  'emergencyContact.phone',
  'bankDetails.accountHolderName',
  'bankDetails.bankName',
  'bankDetails.accountNumber',
  'bankDetails.ifscCode',
  'documents.profileImage.url',
  'documents.aadharCard.url',
  'documents.panCard.url',
];

const DOCUMENT_TYPES = ['aadharCard', 'panCard', 'profileImage'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024; // 3 MB

const getNested = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);

const isProfileComplete = (staff) =>
  PROFILE_REQUIRED_FIELDS.every((p) => {
    const v = getNested(staff, p);
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

// Middleware to verify Staff JWT
const authStaff = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Ensure the token has the correct audience for staff
    if (decoded.aud !== 'staff') {
      throw new Error('Invalid token audience');
    }

    const staff = await Staff.findById(decoded.id).populate('user', 'companyName companyLogo defaultWorkDays');
    if (!staff || !staff.isPortalEnabled) throw new Error('Access denied');

    req.staff = staff;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Please authenticate as staff' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/portal/login — Staff Login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const staff = await Staff.findOne({ email: email.toLowerCase().trim() }).populate('user', 'companyName companyLogo');
    
    if (!staff || !staff.isPortalEnabled) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or portal disabled' });
    }

    // Check lock state
    if (staff.lockUntil && staff.lockUntil > Date.now()) {
      const waitMinutes = Math.ceil((staff.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${waitMinutes} minutes.` });
    }

    const isMatch = await staff.comparePassword(password);
    
    if (!isMatch) {
      staff.loginAttempts += 1;
      if (staff.loginAttempts >= 5) {
        staff.lockUntil = Date.now() + 15 * 60000; // Lock for 15 mins
      }
      await staff.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Successful login, reset attempts
    staff.loginAttempts = 0;
    staff.lockUntil = undefined;
    staff.lastLogin = Date.now();
    await staff.save();

    // Sign JWT with audience 'staff'
    const token = jwt.sign(
      { id: staff._id, aud: 'staff' }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      mustChangePassword: staff.mustChangePassword,
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        employeeId: staff.employeeId,
        designation: staff.designation,
        profileCompleted: staff.profileCompleted,
        companyName: staff.user?.companyName,
        companyLogo: staff.user?.companyLogo,
      }
    });

  } catch (err) {
    console.error('Staff login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/portal/change-password — Mandatory First Login Change
// ─────────────────────────────────────────────────────────────
router.post('/change-password', authStaff, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.staff.mustChangePassword) {
      return res.status(400).json({ success: false, message: 'Password change not mandatory' });
    }

    const isMatch = await req.staff.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    // Password rules validation
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' 
      });
    }

    req.staff.portalPassword = newPassword;
    req.staff.mustChangePassword = false;
    await req.staff.save();

    res.json({ success: true, message: 'Password updated successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/portal/forgot-password — Send Reset Link
// ─────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const staff = await Staff.findOne({ email: email.toLowerCase().trim() });
    
    // Same security logic as admin auth to prevent enum
    if (!staff || !staff.isPortalEnabled) {
      return res.json({ success: true, message: 'If that email exists and has portal access, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    staff.passwordResetToken = resetToken;
    staff.passwordResetExpires = Date.now() + 15 * 60000; // 15 minutes expiry
    await staff.save();

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const origin = req.get('origin') || frontendUrl;
      const resetLink = `${(origin || frontendUrl).replace(/\/$/, '')}/portal/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(staff, resetToken, origin, resetLink);
    } catch (emailErr) {
      console.error('Password reset email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'If that email exists and has portal access, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/portal/reset-password — Set New Password
// ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' 
      });
    }

    const staff = await Staff.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!staff) {
      return res.status(400).json({ success: false, message: 'Token invalid or expired' });
    }

    staff.portalPassword = password;
    staff.passwordResetToken = undefined;
    staff.passwordResetExpires = undefined;
    staff.mustChangePassword = false; // They just set it
    await staff.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/portal/me — Get Profile
// ─────────────────────────────────────────────────────────────
router.get('/me', authStaff, async (req, res) => {
  const s = req.staff;
  res.json({
    success: true,
    staff: {
      id: s._id,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      employeeId: s.employeeId,
      designation: s.designation,
      department: s.department,
      type: s.type,
      joiningDate: s.joiningDate,
      pfNumber: s.pfNumber,
      overtimeEligible: s.overtimeEligible || false,
      workingDays: s.workingDays && s.workingDays.length ? s.workingDays : null,
      clientAssignment: s.clientAssignment || '',
      defaultWorkDays: s.user?.defaultWorkDays || [1, 2, 3, 4, 5],
      // Self-service profile fields
      panNumber: s.panNumber || '',
      dob: s.dob,
      gender: s.gender || '',
      address: s.address || {},
      emergencyContact: s.emergencyContact || {},
      bankDetails: s.bankDetails || {},
      documents: s.documents || {},
      profileCompleted: !!s.profileCompleted,
      // Legacy nested financials object (used by payslip PDFs)
      financials: s.financials,
      salaryDetails: s.salaryDetails,
      leaveBalance: s.leaveBalance,
      companyName: s.user?.companyName,
      companyLogo: s.user?.companyLogo,
    }
  });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/portal/me — Update Profile
// Employees use this for both profile-completion (mandatory fields)
// and lightweight updates to their own contact info.
// Admin-controlled fields (employeeId, salaryDetails, etc.) are
// rejected here to keep this a self-service endpoint.
// ─────────────────────────────────────────────────────────────
const ADMIN_ONLY_FIELDS = [
  'employeeId',
  'type',
  'designation',
  'department',
  'pfNumber',
  'joiningDate',
  'salaryDetails',
  'leaveBalance',
  'overtimeEligible',
  'workingDays',
  'clientAssignment',
  'isPortalEnabled',
  'portalPassword',
  'mustChangePassword',
  'loginAttempts',
  'lockUntil',
  'user',
];

router.put('/me', authStaff, async (req, res) => {
  try {
    // Strip any attempt to set admin-only fields
    ADMIN_ONLY_FIELDS.forEach((f) => { delete req.body[f]; });

    // PAN validation
    if (req.body.panNumber !== undefined) {
      const pan = String(req.body.panNumber || '').toUpperCase().trim();
      if (!pan) {
        return res.status(400).json({ success: false, message: 'PAN Number is required.' });
      }
      if (!isValidPAN(pan)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PAN Number format. Expected: ABCDE1234F (5 letters, 4 digits, 1 letter).'
        });
      }
      req.body.panNumber = pan;
      // Mirror to financials for legacy payslip support
      req.staff.financials = {
        ...(req.staff.financials || {}),
        panNumber: pan,
      };
    }

    // DOB validation
    if (req.body.dob !== undefined) {
      if (req.body.dob === '' || req.body.dob === null) {
        req.body.dob = undefined;
      } else {
        const d = new Date(req.body.dob);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid date of birth.' });
        }
        req.body.dob = d;
      }
    }

    // Gender validation
    if (req.body.gender !== undefined) {
      const allowed = ['Male', 'Female', 'Other', ''];
      if (!allowed.includes(req.body.gender)) {
        return res.status(400).json({ success: false, message: 'Invalid gender value.' });
      }
    }

    // Bank details — mirror to financials for legacy payslip support
    if (req.body.bankDetails !== undefined) {
      req.staff.financials = {
        ...(req.staff.financials || {}),
        bankName: req.body.bankDetails.bankName,
        accountNumber: req.body.bankDetails.accountNumber,
        ifscCode: req.body.bankDetails.ifscCode,
      };
    }

    // Apply remaining fields
    const ALLOWED = [
      'phone', 'panNumber', 'dob', 'gender',
      'address', 'emergencyContact', 'bankDetails',
    ];
    ALLOWED.forEach((field) => {
      if (req.body[field] !== undefined) {
        req.staff[field] = req.body[field];
      }
    });

    // Recompute profile-completion status
    req.staff.profileCompleted = isProfileComplete(req.staff.toObject
      ? req.staff.toObject()
      : req.staff);

    await req.staff.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      staff: {
        profileCompleted: req.staff.profileCompleted,
        panNumber: req.staff.panNumber,
        dob: req.staff.dob,
        gender: req.staff.gender,
        address: req.staff.address,
        emergencyContact: req.staff.emergencyContact,
        bankDetails: req.staff.bankDetails,
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/portal/me/documents/:type — Upload identity documents
// type: aadharCard | panCard | profileImage
// ─────────────────────────────────────────────────────────────
router.post('/me/documents/:type', authStaff, async (req, res) => {
  try {
    const { type } = req.params;
    const { data, originalName } = req.body;

    if (!DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid document type.' });
    }
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ success: false, message: 'Document data is required.' });
    }

    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid document format. Expected base64 data URL.' });
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, PNG, WEBP images or PDF files are allowed.',
      });
    }

    const byteSize = Buffer.byteLength(base64Data, 'base64');
    if (byteSize > MAX_DOCUMENT_BYTES) {
      return res.status(400).json({ success: false, message: 'File size must be under 3MB.' });
    }

    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'bin';
    const fileName = `${type}_${Date.now()}.${ext}`;

    if (!req.staff.documents) {
      req.staff.documents = {};
    }

    req.staff.documents[type] = {
      fileName,
      originalName: originalName || fileName,
      url: data,
      uploadedAt: new Date(),
    };

    req.staff.profileCompleted = isProfileComplete(
      req.staff.toObject ? req.staff.toObject() : req.staff
    );

    await req.staff.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: req.staff.documents[type],
      profileCompleted: req.staff.profileCompleted,
    });
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/portal/me/profile-status
// Read-only check that returns whether the staff's profile is
// complete and which fields are still missing.
// ─────────────────────────────────────────────────────────────
router.patch('/me/profile-status', authStaff, async (req, res) => {
  const obj = req.staff.toObject ? req.staff.toObject() : req.staff;
  const missing = PROFILE_REQUIRED_FIELDS.filter((p) => {
    const v = getNested(obj, p);
    return v === undefined || v === null || String(v).trim() === '';
  });
  res.json({
    success: true,
    profileCompleted: missing.length === 0,
    missingFields: missing,
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/portal/payslips — Get Staff's Pushed Payslips (Last 3 Months)
// ─────────────────────────────────────────────────────────────
router.get('/payslips', authStaff, async (req, res) => {
  try {
    const { search } = req.query;
    
    // Filter for last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const filter = {
      employeeId: req.staff.employeeId,
      user: req.staff.user._id,
      isPushedToPortal: true,
      createdAt: { $gte: threeMonthsAgo }
    };

    if (search) {
      filter.$or = [
        { month: { $regex: search, $options: 'i' } },
        { year: parseInt(search) || 0 }
      ];
    }

    const payslips = await Payslip.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, data: payslips });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
});

// We need to import Payslip model here if not available
const Payslip = require('../models/Payslip');

module.exports = { router, authStaff };

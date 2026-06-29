const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const Notification = require('../models/Notification');
const { auth: protect } = require('./auth');
const crypto = require('crypto');
const emailService = require('../utils/emailService');
const { buildSetupLink } = require('../utils/urlHelper');

// ─────────────────────────────────────────────────────────────
// PAN validation helper
// Format: 5 uppercase letters + 4 digits + 1 uppercase letter
// Example: ABCDE1234F
// ─────────────────────────────────────────────────────────────
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidPAN = (pan) => typeof pan === 'string' && PAN_REGEX.test(pan);
const isValidEmail = (email) => typeof email === 'string' && EMAIL_REGEX.test(email.toLowerCase().trim());
const DEFAULT_FRONTEND_URL = 'https://rohit98k-payroll-portal.vercel.app';

// NOTE: This function is kept for backwards compatibility for routes that might need
// to use the request origin (like redirects). For invitation links, ALWAYS use
// buildSetupLink() from urlHelper.js instead to ensure URLs are never preview/deployment URLs.
function resolvePortalBaseUrl(req) {
  const cleanUrl = (value) => String(value || '').trim().replace(/\/$/, '');
  const isLocalUrl = (value) => /(^https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);

  // Block ALL Vercel preview/git-branch deployments (URLs containing a commit hash
  // or branch slug followed by .vercel.app) AND any known dead preview URLs.
  // Production deployments use a stable custom alias with no hash in the hostname.
  const isPreviewOrDeadUrl = (value) =>
    /[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-projects\.vercel\.app/i.test(value) || // git preview pattern
    /payslip-generator-[a-z0-9]+-[a-z0-9]+\.vercel\.app/i.test(value);      // app preview pattern

  // FRONTEND_URL and APP_URL from environment are the authoritative production URLs.
  // Only fall back to req.get('origin') if those are absent.
  const envFrontendUrl = cleanUrl(process.env.FRONTEND_URL);
  const envAppUrl = cleanUrl(process.env.APP_URL);

  if (envFrontendUrl && !isLocalUrl(envFrontendUrl) && !isPreviewOrDeadUrl(envFrontendUrl)) {
    return envFrontendUrl;
  }
  if (envAppUrl && !isLocalUrl(envAppUrl) && !isPreviewOrDeadUrl(envAppUrl)) {
    return envAppUrl;
  }

  // Use request origin only when env vars are absent/local
  const origin = cleanUrl(req.get('origin') || '');
  if (origin && !isLocalUrl(origin) && !isPreviewOrDeadUrl(origin)) {
    return origin;
  }

  return DEFAULT_FRONTEND_URL;
}

async function provisionStaffPortalAccess(staff, req, options = {}) {
  // Generate a secure 64-char hex setup token. The Staff model's existing
  // passwordResetToken / passwordResetExpires fields are reused as the
  // "setup" token (24h expiry). The employee clicks the link, sets their
  // own password, and the token is cleared. No default password is ever
  // generated or sent.
  const setupToken = crypto.randomBytes(32).toString('hex');

  staff.passwordResetToken = setupToken;
  staff.passwordResetExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  staff.isPortalEnabled = true;
  staff.loginAttempts = 0;
  staff.lockUntil = undefined;
  // Intentionally do NOT set staff.portalPassword or staff.mustChangePassword here.
  // The account stays in an "invited" state until the employee sets their password
  // via /api/portal/setup-password. Until then, portal login attempts will fail
  // because portalPassword is undefined and the pre-save bcrypt hook skips it.

  await staff.save();

  // ALWAYS use buildSetupLink() — it reads from env vars and rejects preview URLs.
  // This guarantees the link never depends on the current deployment.
  const setupLink = buildSetupLink(setupToken);
  const result = {
    resetLink: setupLink, // keep the field name stable for downstream consumers
    emailPreviewUrl: null,
    emailError: null,
    smtpAccepted: false,
    smtpRejected: [],
    smtpResponse: null,
  };

  if (options.sendEmail !== false) {
    try {
      const sendResult = await emailService.sendTeamMemberOnboarding(staff, setupLink);
      // sendResult is { previewUrl, info } when available
      if (sendResult && typeof sendResult === 'object') {
        result.emailPreviewUrl = sendResult.previewUrl || null;
        if (sendResult.info) {
          result.smtpAccepted = !!(sendResult.info.accepted && sendResult.info.accepted.length > 0);
          result.smtpRejected = sendResult.info.rejected || [];
          result.smtpResponse = sendResult.info.response || null;
        }
      } else if (typeof sendResult === 'string') {
        // Backward-compat: older callers got a string (preview URL)
        result.emailPreviewUrl = sendResult;
      }
    } catch (emailErr) {
      result.emailError = emailErr.message;
      console.error('Failed to send team member onboarding email:', emailErr.message);
    }
  }

  return result;
}

const { logActivity } = require('../utils/logger');
router.get('/', protect, async (req, res) => {
  try {
    // .lean() returns plain JS objects (no Mongoose overhead).
    // Projection drops large embedded fields the list view doesn't use
    // (documents.* files, full financials, embedded bankDetails blobs).
    const staff = await Staff.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
      .select('-documents -financials -address -emergencyContact -bankDetails');
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add new staff — Employee ID is OPTIONAL.
// Per the new flow, admin only enters basic info; the employee
// completes the rest after first login. Auto-Employee-ID generation
// has been removed.
router.post('/', protect, async (req, res) => {
  try {
    const requestedId = (req.body.employeeId || '').trim();

    // PAN validation: must match ABCDE1234F (only if provided by admin)
    if (req.body.panNumber && !isValidPAN(String(req.body.panNumber).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN Number format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter).'
      });
    }

    // Validate financials.panNumber (legacy admin form path) too
    if (req.body.financials?.panNumber && !isValidPAN(String(req.body.financials.panNumber).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN Number format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter).'
      });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid team member email address is required.'
      });
    }

    // If admin provided an employeeId, make sure it's unique within their tenant
    if (requestedId) {
      const exists = await Staff.findOne({ user: req.user._id, employeeId: requestedId });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${requestedId}" is already in use.`
        });
      }
    }

    // Build the staff document. Employee ID is intentionally optional.
    const staffPayload = {
      ...req.body,
      email,
      user: req.user._id,
    };

    // Normalise PAN to uppercase on the top-level field
    if (staffPayload.panNumber) {
      staffPayload.panNumber = String(staffPayload.panNumber).toUpperCase().trim();
    }
    // Mirror top-level PAN into financials.panNumber for legacy payslip support
    if (staffPayload.panNumber) {
      staffPayload.financials = {
        ...(staffPayload.financials || {}),
        panNumber: staffPayload.panNumber,
      };
    }
    // Same for bankDetails → financials (legacy payslip)
    if (staffPayload.bankDetails) {
      staffPayload.financials = {
        ...(staffPayload.financials || {}),
        bankName: staffPayload.bankDetails.bankName,
        accountNumber: staffPayload.bankDetails.accountNumber,
        ifscCode: staffPayload.bankDetails.ifscCode,
      };
    }

    // If admin provided an employeeId, store it; otherwise leave undefined
    if (requestedId) {
      staffPayload.employeeId = requestedId;
    } else {
      delete staffPayload.employeeId;
    }

    const staff = new Staff(staffPayload);
    await staff.save();

    let portalAccess = null;
    try {
      portalAccess = await provisionStaffPortalAccess(staff, req, { sendEmail: true });
    } catch (provisionErr) {
      console.error('Failed to provision staff portal after creation:', provisionErr.message);
      portalAccess = {
        resetLink: null,
        emailPreviewUrl: null,
        emailError: 'Portal access was created, but password setup could not be generated.',
      };
    }

    await logActivity(
      req.user._id,
      'STAFF_CREATED',
      `Added new staff: ${staff.fullName}${staff.employeeId ? ` (${staff.employeeId})` : ''}`,
      { staffId: staff._id }
    );

    await new Notification({
      admin: req.user._id,
      staff: staff._id,
      recipientType: 'admin',
      type: 'STAFF_CREATED',
      referenceId: staff._id,
      message: `New staff added: ${staff.fullName}${staff.employeeId ? ` (${staff.employeeId})` : ''} — ${staff.designation || 'N/A'}`
    }).save();

    res.status(201).json({ success: true, data: staff, portalAccess });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get a specific staff member
router.get('/:id', protect, async (req, res) => {
  try {
    // lean() — read-only detail fetch never mutates; no need for a Mongoose doc
    const staff = await Staff.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a staff member
router.put('/:id', protect, async (req, res) => {
  try {
    // PAN validation on update
    if (req.body.panNumber && !isValidPAN(String(req.body.panNumber).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN Number format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter).'
      });
    }
    if (req.body.financials?.panNumber && !isValidPAN(String(req.body.financials.panNumber).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN Number format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter).'
      });
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'A valid team member email address is required.'
        });
      }
      req.body.email = email;
    }

    // Normalise PAN to uppercase before persisting
    if (req.body.panNumber) {
      req.body.panNumber = String(req.body.panNumber).toUpperCase().trim();
    }
    if (req.body.panNumber) {
      req.body.financials = {
        ...(req.body.financials || {}),
        panNumber: req.body.panNumber,
      };
    }
    if (req.body.bankDetails) {
      req.body.financials = {
        ...(req.body.financials || {}),
        bankName: req.body.bankDetails.bankName,
        accountNumber: req.body.bankDetails.accountNumber,
        ifscCode: req.body.bankDetails.ifscCode,
      };
    }

    const updatedStaff = await Staff.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    await logActivity(req.user._id, 'STAFF_UPDATED', `Updated details for ${updatedStaff.fullName}`, { staffId: updatedStaff._id });
    res.json({ success: true, data: updatedStaff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete a staff member
router.delete('/:id', protect, async (req, res) => {
  try {
    const deletedStaff = await Staff.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deletedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    await logActivity(req.user._id, 'STAFF_DELETED', `Deleted staff: ${deletedStaff.fullName}`, { staffId: deletedStaff._id });

    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/staff/:id/provision-portal — Admin Provisions Staff Portal
// ─────────────────────────────────────────────────────────────
router.post('/:id/provision-portal', protect, async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, user: req.user._id }).populate('user', 'companyName companyLogo');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const portalAccess = await provisionStaffPortalAccess(staff, req, { sendEmail: true });

    await logActivity(req.user._id, 'PORTAL_ACCESS_GRANTED', `Granted portal access to ${staff.fullName}`, { staffId: staff._id });

    const message = portalAccess.emailError
      ? `Portal access granted, but email failed to send (${portalAccess.emailError}). Share the setup link below manually.`
      : `Portal access granted. Login credentials emailed to ${staff.email}.`;

    res.json({
      success: true,
      message,
      resetLink: portalAccess.resetLink,
      emailPreviewUrl: portalAccess.emailPreviewUrl,
      emailError: portalAccess.emailError,
    });
  } catch (err) {
    console.error('Provisioning error:', err);
    res.status(500).json({ success: false, message: 'Server error provisioning portal' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/staff/:id/revoke-portal — Admin Revokes Staff Portal
// ─────────────────────────────────────────────────────────────
router.delete('/:id/revoke-portal', protect, async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, user: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    staff.isPortalEnabled = false;
    staff.portalPassword = undefined;
    
    await staff.save();

    await logActivity(req.user._id, 'PORTAL_ACCESS_REVOKED', `Revoked portal access for ${staff.fullName}`, { staffId: staff._id });

    res.json({ success: true, message: 'Portal access revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error revoking portal' });
  }
});

module.exports = router;

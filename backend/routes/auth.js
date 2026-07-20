const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');
const { buildVerifyLink, buildResetLink } = require('../utils/urlHelper');

// In-process JWT → User cache.
// Same token tends to be reused on every protected request; hitting Mongo
// each time adds a 30–80ms round-trip plus a bcrypt-shaped hydration cost.
// We cache the lean User doc keyed by token; TTL is short so password
// changes or account deletion still propagate quickly.
const AUTH_CACHE_TTL_MS = 30 * 1000;
const authCache = new Map(); // token → { user, expiresAt }

function authCacheGet(token) {
  const entry = authCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    authCache.delete(token);
    return null;
  }
  return entry.user;
}
function authCacheSet(token, user) {
  authCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
  // Bound the cache size so it doesn't grow unbounded under high traffic.
  if (authCache.size > 1000) {
    const firstKey = authCache.keys().next().value;
    if (firstKey) authCache.delete(firstKey);
  }
}

// Middleware to verify JWT
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Hot path: same token on every request → cache hit
    const cached = authCacheGet(token);
    if (cached) {
      req.user = cached;
      req.token = token;
      return next();
    }

    // Cold path: lean() drops the Mongoose document overhead and only
    // projects the fields the API actually needs.
    const user = await User.findById(decoded.id).lean();

    if (!user) throw new Error();

    authCacheSet(token, user);
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Please authenticate' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register — Register a new company
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password, companyName, companyAddress } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 3600000; // 24 hours

    const user = new User({
      email,
      password,
      companyName: companyName || undefined,
      companyAddress: companyAddress || undefined,
      verificationToken,
      verificationExpires
    });
    await user.save();

    // Send verification email (awaiting for Vercel stability)
    try {
      // Use centralized URL helper — never use request origin for verification links
      const verifyUrl = buildVerifyLink(verificationToken);
      await sendVerificationEmail(user, verificationToken, verifyUrl);
    } catch (emailErr) {
      console.error('📧 Email failed to send:', emailErr);
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.' 
    });
  } catch (err) {
    console.error('Register error:', err);
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login — Login to company account
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Project only what we need: skip the embedded 50KB base64 logo by
    // default and pull it lazily if/when needed (e.g. PDF generation).
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let passwordMatches = false;
    try {
      passwordMatches = await user.comparePassword(password);
    } catch (compareErr) {
      console.error('Password compare failed:', compareErr);
    }

    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const skipEmailVerification =
      process.env.SKIP_EMAIL_VERIFICATION === 'true' ||
      !isProduction;

    if (!user.isVerified && !skipEmailVerification) {
      return res.status(403).json({ success: false, message: 'Please verify your email address before logging in.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { email: user.email, companyName: user.companyName },
    });
  } catch (err) {
    console.error('Login error:', err);
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/verify-email — Verify account
// ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  console.log(`🔍 Verification Request: ${req.url}`);
  try {
    let { token } = req.query;
    
    // Fallback: Manually parse if req.query is empty (some Vercel edge cases)
    if (!token && req.url.includes('token=')) {
      token = req.url.split('token=')[1];
    }
    
    if (!token) {
      console.warn('⚠️ Verification Failed: Token missing in request');
      return res.status(400).json({ success: false, message: 'Token is required', receivedUrl: req.url });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      const isApiRequest = req.headers.accept && req.headers.accept.includes('application/json');
      if (isApiRequest) {
        return res.status(400).json({ success: false, message: 'The link is invalid or has expired.' });
      }
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Verification Failed</h1>
          <p>The link is invalid or has expired.</p>
          <a href="/login" style="color: #1e3a5f; font-weight: bold;">Back to Login</a>
        </div>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const isApiRequest = req.headers.accept && req.headers.accept.includes('application/json');
    if (isApiRequest) {
      return res.json({ success: true, message: 'Email Verified Successfully!' });
    }

    const fallbackUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://rohit98k-payroll-portal.vercel.app';
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #10b981;">Email Verified Successfully!</h1>
        <p>Redirecting you to the login page...</p>
        <script>
          setTimeout(() => {
            window.location.href = window.location.hostname === 'localhost' ? 'http://localhost:3000/login' : '${fallbackUrl}/login';
          }, 2000);
        </script>
        <a href="${fallbackUrl}/login" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">Go to Login</a>
      </div>
    `);
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/profile — Get company profile (always fresh from DB)
// ─────────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    // Always fetch fresh from DB — never serve stale auth-cache data here.
    // The auth cache is keyed by token and has a 30 s TTL, which means a
    // user who just updated their profile could get stale values back.
    const user = await User.findById(req.user._id)
      .select('-password -verificationToken -verificationExpires -resetPasswordToken -resetPasswordExpires')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/profile — Update company profile & logo
// ─────────────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res, next) => {
  try {
    // req.user may be a lean() plain object from the auth cache (no .save()).
    // Always fetch a full Mongoose document for any write operation.
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const allowedFields = ['companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyCIN', 'companyGST', 'companyWebsite', 'companyLogo'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save();

    // Bust the in-process auth cache so the next GET /profile returns
    // the freshly saved data instead of the stale lean object.
    const token = req.token;
    if (token) authCache.delete(token);

    res.json({ success: true, message: 'Profile updated', user: user.toObject() });
  } catch (err) {
    console.error('Profile update error:', err);
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — Send reset link to email
// ─────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email });
    // Always respond success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Always use centralized URL helper — never use request origin for reset links
    const resetLink = buildResetLink(resetToken);

    // In dev (no NODE_ENV=production), always print the link to the terminal
    // so devs can recover accounts even without a working SMTP setup.
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n────────────────────────────────────────────────────');
      console.log('🔑 DEV MODE — Password Reset Link');
      console.log(`   For: ${user.email}`);
      console.log(`   Link: ${resetLink}`);
      console.log('   (Valid for 1 hour)');
      console.log('────────────────────────────────────────────────────\n');
    }

    try {
      const { sendPasswordResetEmail } = require('../utils/emailService');
      // Pass pre-built URL as customLink (4th param) to override the built-in URL construction
      const previewUrl = await sendPasswordResetEmail(user, resetToken, '', resetLink);
      // If SMTP is not configured and Ethereal is used, the function returns a previewUrl.
      // Surface it so the frontend can show "View test email" link.
      if (previewUrl && process.env.NODE_ENV !== 'production') {
        console.log(`📭 Ethereal preview URL: ${previewUrl}`);
      }
      res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
        // Surface the link in non-production so the UI can offer a "Use this link" button
        ...(process.env.NODE_ENV !== 'production' && { devResetLink: resetLink }),
        // If using Ethereal, give a way to view the actual email
        ...(previewUrl && process.env.NODE_ENV !== 'production' && { devEmailPreview: previewUrl }),
      });
    } catch (emailErr) {
      console.error('📧 Password reset email failed (dev link above still works):', emailErr.message);
      res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
        ...(process.env.NODE_ENV !== 'production' && { devResetLink: resetLink }),
      });
    }
  } catch (err) {
    console.error('Forgot-password error:', err);
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password — Set new password using token
// ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'The reset link is invalid or has expired.' });
    }

    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/dev-latest-reset-link — DEV-ONLY
// Returns the latest active reset link for an email so devs can
// recover accounts when SMTP is broken. Disabled in production.
// ─────────────────────────────────────────────────────────────
router.post('/dev-latest-reset-link', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user || !user.resetPasswordToken || user.resetPasswordExpires < Date.now()) {
    return res.status(404).json({ success: false, message: 'No active reset link for that email. Trigger a forgot-password first.' });
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/reset-password?token=${user.resetPasswordToken}`;
  console.log('🔑 DEV latest-reset-link served for', email, '→', link);
  res.json({ success: true, link });
});

module.exports = { router, auth };

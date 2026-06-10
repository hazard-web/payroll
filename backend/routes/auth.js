const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

// Middleware to verify JWT
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);

    if (!user) throw new Error();

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
router.post('/register', async (req, res) => {
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
      const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
      await sendVerificationEmail(user, verificationToken, origin);
    } catch (emailErr) {
      console.error('📧 Email failed to send:', emailErr);
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.' 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login — Login to company account
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    let passwordMatches = false;
    if (user) {
      try {
        passwordMatches = await user.comparePassword(password);
      } catch (compareErr) {
        console.error('Password compare failed:', compareErr);
      }
    }

    if (!user || !passwordMatches) {
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
    res.json({ success: true, token, user: { email: user.email, companyName: user.companyName } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
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

    const fallbackUrl = process.env.FRONTEND_URL || 'https://payslip-generator-itv8zzdtv-vaibhavverma040802s-projects.vercel.app';
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
// GET /api/auth/profile — Get company profile
// ─────────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/profile — Update company profile & logo
// ─────────────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = ['companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyCIN', 'companyLogo'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    
    await req.user.save();
    res.json({ success: true, message: 'Profile updated', user: req.user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — Send reset link to email
// ─────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
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

    try {
      const { sendPasswordResetEmail } = require('../utils/emailService');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const origin = req.get('origin') || frontendUrl;
      await sendPasswordResetEmail(user, resetToken, origin);
    } catch (emailErr) {
      console.error('📧 Password reset email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password — Set new password using token
// ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
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
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = { router, auth };

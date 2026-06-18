const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const payslipRoutes = require('./routes/payslip');
const { router: authRoutes } = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const { router: staffPortalRoutes } = require('./routes/staffPortal');
const attendanceRoutes = require('./routes/attendance');
const activitiesRoutes = require('./routes/activities');
const leavesRoutes = require('./routes/leaves');
const notificationsRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/payslips', payslipRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/portal', staffPortalRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/support', supportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Payslip Generator API is running',
    timestamp: new Date().toISOString(),
  });
});

const path = require('path');

// Note: On Vercel, static files are served by @vercel/static-build
// On local/dev, we serve frontend static files from here for unified server
if (!process.env.VERCEL) {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
}

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API Route not found' });
});

// Catch-all route for React app (local dev only)
if (!process.env.VERCEL) {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  // Detect MongoDB connection problems and surface a clear, actionable message
  const msg = (err?.message || '').toLowerCase();
  const isMongoDown =
    err?.name === 'MongooseServerSelectionError' ||
    err?.name === 'MongoServerSelectionError' ||
    msg.includes('whitelisted') ||
    msg.includes('could not connect to any servers') ||
    msg.includes('econnrefused') ||
    msg.includes('mongonetworkerror') ||
    msg.includes('buffering timed out') ||
    msg.includes('no primary found') ||
    msg.includes('replicasetnoprimary');

  if (isMongoDown) {
    return res.status(503).json({
      success: false,
      message:
        'Database is unreachable. If using MongoDB Atlas, add your current IP to the cluster whitelist (Network Access → Add IP Address → Allow Access from Anywhere for testing).',
      code: 'DB_UNREACHABLE',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Connect to MongoDB then start server
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payslip_generator';
console.log('🔍 MONGODB_URI =', process.env.MONGODB_URI);
const { runShiftCheck } = require('./utils/cronJobs');
const http = require('http');

if (!process.env.VERCEL) {
  // Start the HTTP server FIRST so requests get clean error responses
  // even when the database is down. This avoids HTTP 000 / connection-refused.
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
    console.log(`📋 API Health   → http://localhost:${PORT}/api/health`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${PORT} is in use. Exiting so nodemon can restart cleanly...`);
      process.exit(0);
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });

  // In development Vercel crons don't fire, so run the shift-check locally every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(async () => {
    console.log('⏰ [local cron] Running shift check...');
    try {
      const r = await runShiftCheck();
      console.log(`✅ [local cron] autoClosed=${r.autoClosed} remindersSent=${r.remindersSent}`);
    } catch (err) {
      console.error('❌ [local cron] Shift check failed:', err.message);
    }
  }, ONE_HOUR);
  console.log('⏰ Local shift-check cron scheduled (every 1 hour)');
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
 .catch((err) => {
  console.error('❌ MongoDB connection error (server is still up — requests will return DB_UNREACHABLE until DB is reachable):');
  console.error(err.message);
});


// Export the app so Vercel Serverless Functions can use it
module.exports = app;


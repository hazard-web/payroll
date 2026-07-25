require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

(async () => {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected! Searching for staff member...');
    const s = await Staff.findOne({ email: 'vg810200@gmail.com' }).lean();
    if (s) {
      console.log('RESULT: FOUND');
      console.log('EMAIL:', s.email);
      console.log('NAME:', s.fullName);
      console.log('PORTAL_ENABLED:', s.isPortalEnabled);
      console.log('HAS_PASSWORD:', !!s.portalPassword);
      console.log('MUST_CHANGE_PASSWORD:', s.mustChangePassword);
    } else {
      console.log('RESULT: NOT_FOUND');
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('Done!');
    process.exit(0);
  }
})();

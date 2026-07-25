require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'payslip_generator' });
    const s = await Staff.findOne({ email: 'rks099871@gmail.com' });
    if (s) {
      s.portalPassword = 'password123';
      await s.save();
      console.log('Password reset successfully to password123 for rks099871@gmail.com');
    } else {
      console.log('Staff member not found!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

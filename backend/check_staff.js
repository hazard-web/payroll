require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'payslip_generator' });
    const staffList = await Staff.find({}).lean();
    console.log(`TOTAL STAFF: ${staffList.length}`);
    staffList.forEach((s) => {
      console.log(`- Email: ${s.email}`);
      console.log(`  Name: ${s.fullName}`);
      console.log(`  Portal Enabled: ${s.isPortalEnabled}`);
      console.log(`  Has Password: ${!!s.portalPassword}`);
      console.log(`  mustChangePassword: ${s.mustChangePassword}`);
      console.log(`  Reset Token: ${s.passwordResetToken}`);
      console.log(`  Reset Expires: ${s.passwordResetExpires}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

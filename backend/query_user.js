require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('Connected! Searching for staff...');
    const s = await Staff.findOne({ email: 'rks099871@gmail.com' }).lean();
    if (s) {
      console.log('FOUND STAFF MEMBER:');
      console.log(`- ID: ${s._id}`);
      console.log(`- Email: ${s.email}`);
      console.log(`- FullName: ${s.fullName}`);
      console.log(`- Portal Enabled: ${s.isPortalEnabled}`);
      console.log(`- Has Password: ${!!s.portalPassword}`);
      console.log(`- mustChangePassword: ${s.mustChangePassword}`);
    } else {
      console.log('STAFF MEMBER NOT FOUND.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
})();

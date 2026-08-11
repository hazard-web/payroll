require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'payslip_generator' });
    const s = await Staff.findOne({ email: 'rohit@automationschool.in' });
    if (s) {
      s.portalPassword = 'password123';
      s.mustChangePassword = false;
      s.isPortalEnabled = true;
      s.profileCompleted = false;
      
      // Clear PAN, DOB, Bank, Address, Emergency Contact, and documents so we can verify the onboarding wizard works correctly
      s.panNumber = '';
      s.dob = undefined;
      s.phone = '0985212494';
      s.fullName = 'ROHIT KUMAR';
      s.bankDetails = {
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Savings'
      };
      s.address = { street: '', city: '', state: '', pincode: '', country: 'India' };
      s.emergencyContact = { name: '', relationship: '', phone: '' };
      s.documents = {
        aadharCard: { url: '', fileName: '', originalName: '', uploadedAt: null },
        panCard: { url: '', fileName: '', originalName: '', uploadedAt: null },
        profileImage: { url: '', fileName: '', originalName: '', uploadedAt: null }
      };
      await s.save();
      console.log('Password reset successfully to password123 and profile cleared for rohit@automationschool.in');
    } else {
      console.log('Staff member not found!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

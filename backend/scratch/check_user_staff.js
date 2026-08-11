require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const staff = await db.collection('staffs').findOne({ email: 'rohit@automationschool.in' });
  if (staff) {
    console.log('--- Staff Details ---');
    console.log('ID:', staff._id);
    console.log('Email:', staff.email);
    console.log('Token:', staff.passwordResetToken);
    console.log('Expires:', staff.passwordResetExpires);
  } else {
    console.log('Staff not found!');
  }

  await client.close();
  process.exit(0);
})();

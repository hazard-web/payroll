require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const staff = await db.collection('staffs').findOne({ email: 'vg810200@gmail.com' });
  console.log('--- Staff Document ---');
  console.log(JSON.stringify(staff, null, 2));

  if (staff) {
    const attendanceCount = await db.collection('attendances').countDocuments({ staff: staff._id });
    console.log(`\nAttendance records count: ${attendanceCount}`);
    
    const attendances = await db.collection('attendances').find({ staff: staff._id }).limit(5).toArray();
    console.log('--- Sample Attendances ---');
    console.log(JSON.stringify(attendances, null, 2));
  }

  await client.close();
  process.exit(0);
})();

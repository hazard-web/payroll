require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const staffs = await db.collection('staffs').find({}).toArray();
  console.log('--- All Staff Records ---');
  staffs.forEach(s => {
    console.log(`ID: ${s._id}, Name: ${s.fullName}, Email: ${s.email}, Designation: ${s.designation}, Dept: ${s.department}`);
  });

  const totalAttendances = await db.collection('attendances').countDocuments({});
  console.log(`\nTotal attendance records in database: ${totalAttendances}`);

  const sampleAttendances = await db.collection('attendances').find({}).limit(10).toArray();
  console.log('\n--- Sample Attendances ---');
  sampleAttendances.forEach(a => {
    console.log(`ID: ${a._id}, StaffID: ${a.staff}, Date: ${a.date}, PunchIn: ${a.punchIn}, PunchOut: ${a.punchOut}`);
  });

  await client.close();
  process.exit(0);
})();

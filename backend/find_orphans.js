require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  // Find all attendance records and see if any staff field matches a deleted staff
  const attendances = await db.collection('attendances').find({}).toArray();
  const staffIdsInAttendances = [...new Set(attendances.map(a => String(a.staff)))];
  
  console.log('--- Staff IDs present in Attendances ---');
  for (const sId of staffIdsInAttendances) {
    const staff = await db.collection('staffs').findOne({ _id: sId });
    if (staff) {
      console.log(`Present: ID=${sId}, Name=${staff.fullName}, Email=${staff.email}`);
    } else {
      // Orphaned attendance
      console.log(`Orphaned: ID=${sId}`);
    }
  }
  
  // Let's also check if there are any other staffs in any collection or audit logs
  const logs = await db.collection('activitylogs').find({ description: { $regex: /Vikash|vg8102/i } }).toArray();
  console.log('\n--- Activity Logs ---');
  console.log(JSON.stringify(logs, null, 2));

  await client.close();
  process.exit(0);
})();

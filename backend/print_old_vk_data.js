require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const oldId = new ObjectId('6a423c9b35fd8bb7e588f0bb');
  
  console.log(`--- Records for old staff ID: ${oldId} ---`);
  
  const attendances = await db.collection('attendances').find({ staff: oldId }).toArray();
  console.log(`Attendances: ${attendances.length}`);
  attendances.forEach(a => {
    console.log(` - Date: ${a.date}, PunchIn: ${a.punchIn}, PunchOut: ${a.punchOut}, status: ${a.status}`);
  });
  
  const leaves = await db.collection('leaverequests').find({ staff: oldId }).toArray();
  console.log(`\nLeave Requests: ${leaves.length}`);
  leaves.forEach(l => {
    console.log(` - Type: ${l.type}, Start: ${l.startDate}, End: ${l.endDate}, status: ${l.status}, Reason: ${l.reason}`);
  });

  const notifications = await db.collection('notifications').find({ staff: oldId }).toArray();
  console.log(`\nNotifications: ${notifications.length}`);

  const payslips = await db.collection('payslips').find({ staff: oldId }).toArray();
  console.log(`\nPayslips: ${payslips.length}`);

  await client.close();
  process.exit(0);
})();

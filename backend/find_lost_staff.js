require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const LOST_IDS = [
  '6a3610d3f768e9ad963d2a62',
  '6a361307a215c55427090756',
  '6a3d0bd38a1ea765d118c5fb',
  '6a423c9b35fd8bb7e588f0bb',
  '6a4243aa60ad3ab64d164fb4',
  '6a424b313e9f34a33e4aca52'
].map(id => new ObjectId(id));

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');

  // Check payslips for lost staff IDs (may have name/email embedded)
  console.log('=== PAYSLIPS for lost staff ===');
  const payslips = await db.collection('payslips').find({ staff: { $in: LOST_IDS } }).project({ staff:1, staffName:1, staffEmail:1, designation:1, basicSalary:1 }).limit(30).toArray();
  console.log(JSON.stringify(payslips, null, 2));

  // Check activity logs
  console.log('\n=== ACTIVITY LOGS ===');
  const logs = await db.collection('activitylogs').find({ staff: { $in: LOST_IDS } }).limit(10).toArray();
  console.log(JSON.stringify(logs, null, 2));

  await client.close();
  process.exit(0);
})();

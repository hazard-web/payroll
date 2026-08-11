require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const activities = await db.collection('activitylogs').find({}).sort({ timestamp: -1 }).limit(20).toArray();
  console.log('--- Recent Activities ---');
  activities.forEach(a => {
    const ts = a.timestamp ? (a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp) : 'N/A';
    console.log(`[${ts}] User: ${a.user}, Action: ${a.action}, Details: ${a.details}`);
  });

  await client.close();
  process.exit(0);
})();

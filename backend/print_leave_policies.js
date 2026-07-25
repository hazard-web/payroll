require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const policies = await db.collection('leavepolicies').find({}).toArray();
  console.log('--- All Leave Policies ---');
  policies.forEach(p => {
    console.log(JSON.stringify(p, null, 2));
  });

  await client.close();
  process.exit(0);
})();

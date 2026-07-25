require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  await db.collection('staffs').updateOne({ email: 'vg810200@gmail.com' }, { $set: { fullName: 'VINAY GUPTA' } });
  console.log('Updated vg810200 staff name to VINAY GUPTA');
  await client.close();
  process.exit(0);
})();

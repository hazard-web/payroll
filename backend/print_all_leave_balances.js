require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const staffs = await db.collection('staffs').find({}).toArray();
  console.log('--- All Staff Leave Balances ---');
  staffs.forEach(s => {
    console.log(`Name: ${s.fullName}, Email: ${s.email}, CL: ${s.leaveBalance?.casual}, SL: ${s.leaveBalance?.sick}`);
  });

  await client.close();
  process.exit(0);
})();

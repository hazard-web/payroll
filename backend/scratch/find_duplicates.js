require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const duplicates = await db.collection('staffs').aggregate([
    { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log('--- Duplicate Email Groups ---');
  if (duplicates.length === 0) {
    console.log('No duplicate emails found!');
  } else {
    duplicates.forEach(d => {
      console.log(`Email: ${d._id}, Count: ${d.count}, IDs: ${d.ids.join(', ')}`);
    });
  }

  await client.close();
  process.exit(0);
})();

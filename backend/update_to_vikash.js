require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  // Update in staffs collection
  const staffResult = await db.collection('staffs').updateOne(
    { email: 'vg810200@gmail.com' },
    { $set: { fullName: 'Vikash Kumar' } }
  );
  console.log(`Updated staffs collection: matched ${staffResult.matchedCount}, modified ${staffResult.modifiedCount}`);
  
  // Also update in users collection just in case
  const userResult = await db.collection('users').updateOne(
    { email: 'vg810200@gmail.com' },
    { $set: { name: 'Vikash Kumar' } } // or fullName if exists
  );
  console.log(`Updated users collection: matched ${userResult.matchedCount}, modified ${userResult.modifiedCount}`);

  await client.close();
  console.log('Database sync complete. Reset name to Vikash Kumar.');
  process.exit(0);
})();

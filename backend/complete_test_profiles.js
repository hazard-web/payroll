// Mark vg810200@gmail.com and rks099871@gmail.com staff records as profileCompleted = true
// This allows the user to bypass the mandatory profile-completion redirection
// during testing.
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  const col = db.collection('staffs');

  console.log('Updating vg810200@gmail.com and rks099871@gmail.com...');
  const result = await col.updateMany(
    { email: { $in: ['vg810200@gmail.com', 'rks099871@gmail.com'] } },
    { $set: { profileCompleted: true } }
  );

  console.log(`Updated ${result.modifiedCount} records.`);

  // Verify
  const updated = await col.find({ email: { $in: ['vg810200@gmail.com', 'rks099871@gmail.com'] } }).toArray();
  updated.forEach(s => {
    console.log(` - ${s.email} | profileCompleted: ${s.profileCompleted}`);
  });

  await client.close();
  process.exit(0);
})();

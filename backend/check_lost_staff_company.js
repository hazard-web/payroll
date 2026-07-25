// Re-create the 6 lost staff members
// vg810200@gmail.com belongs to company: vg810200@gmail.com (XYZ) - ID: 6a3419389b27bc77f4533f7f
// rks099871@gmail.com belongs to company: rks099871@gmail.com (BDA technologies) - ID: 6a339d9f5c03bbdfba7202d3
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');

  // Find all companies to understand who should own these staff
  const users = await db.collection('users').find({}).project({ _id:1, email:1, companyName:1 }).toArray();
  console.log('Companies:');
  users.forEach(u => console.log(' -', u._id, '|', u.email, '|', u.companyName));

  // Check existing staff to see which company they belong to (to match pattern)
  const existing = await db.collection('staffs').find({}).project({ _id:1, email:1, fullName:1, user:1 }).toArray();
  console.log('\nExisting staff and their company (user) IDs:');
  existing.forEach(s => console.log(' -', s.email, '| user:', s.user));

  // The lost staff emails were: vg810200@gmail.com and rks099871@gmail.com
  // These are ALSO company admin emails, so they were set up as staff accounts under their own company
  // or under another company. We need to re-create them.

  // Check if they already exist
  const vg = await db.collection('staffs').findOne({ email: 'vg810200@gmail.com' });
  const rks = await db.collection('staffs').findOne({ email: 'rks099871@gmail.com' });
  console.log('\nvg810200@gmail.com staff exists:', !!vg);
  console.log('rks099871@gmail.com staff exists:', !!rks);

  await client.close();
  process.exit(0);
})();

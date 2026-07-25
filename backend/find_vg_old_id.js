require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  console.log('Searching payslips for vg810200@gmail.com...');
  const payslips = await db.collection('payslips').find({ 
    $or: [
      { staffEmail: 'vg810200@gmail.com' },
      { email: 'vg810200@gmail.com' },
      { staffName: /Vikash|Vinay/i }
    ]
  }).toArray();
  
  console.log(`Found ${payslips.length} payslips:`);
  payslips.forEach(p => {
    console.log(`Payslip ID: ${p._id}, Staff ID: ${p.staff}, Name: ${p.staffName}, Email: ${p.staffEmail || p.email}, Month: ${p.month}/${p.year}`);
  });

  console.log('\nSearching leave requests for vg810200@gmail.com...');
  // We can look up in leaverequests but since they don't store email, we check if any matches
  // Let's check all collections for the email
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const name = col.name;
    const doc = await db.collection(name).findOne({ 
      $or: [
        { email: 'vg810200@gmail.com' },
        { staffEmail: 'vg810200@gmail.com' }
      ]
    });
    if (doc) {
      console.log(`Found email in collection "${name}": ID=${doc._id}, staff=${doc.staff}`);
    }
  }

  await client.close();
  process.exit(0);
})();

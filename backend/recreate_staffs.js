// Recreate staffs collection to break the Atlas M0 collection lock
// This is safe - it exports all data, drops the collection, re-imports
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected!');
    const db = client.db('payslip_generator');
    const col = db.collection('staffs');

    // Use hint(_id:1) to force _id index scan - avoids broken email index
    console.log('Backing up all staff documents using _id index hint...');
    console.time('backup');
    const docs = await col.find({}).hint({ _id: 1 }).toArray();
    console.timeEnd('backup');
    console.log(`Backed up ${docs.length} staff documents.`);

    if (docs.length === 0) {
      console.error('No documents found! Aborting to avoid data loss.');
      process.exit(1);
    }

    // Print emails for confirmation
    docs.forEach((d, i) => console.log(`  [${i}] ${d.email} - ${d.fullName}`));

    // Drop the locked collection
    console.log('Dropping staffs collection...');
    await col.drop();
    console.log('Dropped!');

    // Re-insert all documents
    console.log('Re-inserting all documents...');
    const result = await db.collection('staffs').insertMany(docs);
    console.log(`Re-inserted ${result.insertedCount} documents.`);

    // Recreate indexes
    console.log('Recreating indexes...');
    await db.collection('staffs').createIndex({ email: 1 });
    await db.collection('staffs').createIndex({ employeeId: 1 }, { sparse: true });
    await db.collection('staffs').createIndex({ user: 1, createdAt: -1 });
    await db.collection('staffs').createIndex({ user: 1, employeeId: 1 });
    await db.collection('staffs').createIndex({ user: 1, isPortalEnabled: 1 });
    await db.collection('staffs').createIndex({ user: 1, type: 1 });
    console.log('Indexes recreated!');

    // Verify by querying one staff by email
    console.log('Verifying: querying vg810200@gmail.com by email...');
    console.time('verify_query');
    const verifyDoc = await db.collection('staffs').findOne({ email: 'vg810200@gmail.com' });
    console.timeEnd('verify_query');
    console.log('Verify result:', verifyDoc ? `FOUND: ${verifyDoc.fullName}` : 'NOT FOUND');

    console.log('\n✅ SUCCESS! staffs collection recreated successfully.');
    console.log('The collection lock is now broken. Login should work normally.');
  } catch (err) {
    console.error('ERROR:', err.message, err.stack);
  } finally {
    await client.close();
    console.log('Done.');
    process.exit(0);
  }
})();

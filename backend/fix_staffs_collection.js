// Fix corrupted staffs collection - fetches all docs by _id with 8s timeout each
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const ALL_IDS = [
  '6a352b77a7a8a1f2f13883dc',
  '6a3610d3f768e9ad963d2a62',
  '6a3612c1a215c5542709074a',
  '6a361307a215c55427090756',
  '6a3d0bd38a1ea765d118c5fb',
  '6a423c9b35fd8bb7e588f0bb',
  '6a4243aa60ad3ab64d164fb4',
  '6a424b313e9f34a33e4aca52',
  '6a424cef9211ee60189b0bb1',
  '6a436c3f0ca8126a208ddbdc',
  '6a436c8b0ca8126a208ddbeb',
  '6a436db188b7fa7cfcd2e804',
  '6a436de888b7fa7cfcd2e80f',
  '6a54b816895b28a4790ad5f0',
  '6a54b8b13724377ff785c48c',
  '6a54b8ea3724377ff785c49b',
];

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected!\n');
    const db = client.db('payslip_generator');
    const col = db.collection('staffs');

    // Step 1: Fetch each document by _id with 8s timeout
    const goodDocs = [];
    const badIds = [];

    for (const idStr of ALL_IDS) {
      const oid = new ObjectId(idStr);
      process.stdout.write(`Fetching ${idStr}... `);
      try {
        const doc = await Promise.race([
          col.findOne({ _id: oid }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000))
        ]);
        if (doc) {
          console.log(`✅ ${doc.email} (${doc.fullName})`);
          goodDocs.push(doc);
        } else {
          console.log(`⚠️  NOT FOUND`);
        }
      } catch (err) {
        console.log(`❌ ${err.message} — corrupted, skipping`);
        badIds.push(idStr);
      }
    }

    console.log(`\n📊 Summary: ${goodDocs.length} good, ${badIds.length} corrupted`);
    if (badIds.length > 0) {
      console.log('⚠️  Corrupted IDs:', badIds.join(', '));
    }

    if (goodDocs.length === 0) {
      console.error('❌ No good docs found! Cannot proceed safely.');
      process.exit(1);
    }

    // Step 2: Drop the whole collection
    console.log('\nDropping staffs collection...');
    await col.drop();
    console.log('✅ Dropped!');

    // Step 3: Re-insert all recoverable docs
    console.log(`Re-inserting ${goodDocs.length} documents...`);
    const result = await db.collection('staffs').insertMany(goodDocs, { ordered: false });
    console.log(`✅ Inserted: ${result.insertedCount}`);

    // Step 4: Recreate all indexes fresh
    console.log('Recreating indexes...');
    await db.collection('staffs').createIndex({ email: 1 });
    await db.collection('staffs').createIndex({ employeeId: 1 }, { sparse: true });
    await db.collection('staffs').createIndex({ user: 1, createdAt: -1 });
    await db.collection('staffs').createIndex({ user: 1, employeeId: 1 });
    await db.collection('staffs').createIndex({ user: 1, isPortalEnabled: 1 });
    await db.collection('staffs').createIndex({ user: 1, type: 1 });
    console.log('✅ Indexes created!');

    // Step 5: Verify email queries now work instantly
    console.log('\nVerifying email queries...');
    for (const email of ['vg810200@gmail.com', 'rks099871@gmail.com']) {
      const t = Date.now();
      const doc = await db.collection('staffs').findOne({ email });
      const ms = Date.now() - t;
      console.log(`  ${email}: ${doc ? `✅ FOUND (${doc.fullName}) in ${ms}ms` : `❌ NOT FOUND in ${ms}ms`}`);
    }

    console.log('\n🎉 SUCCESS! staffs collection is healthy. Login will work now.');

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await client.close();
    console.log('Connection closed.');
    process.exit(0);
  }
})();

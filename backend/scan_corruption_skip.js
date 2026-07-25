require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Scanning staffs collection document-by-document using skip...');
    const db = client.db('payslip_generator');
    
    // Get total count first
    const total = await db.collection('staffs').countDocuments();
    console.log(`Total documents in staffs collection: ${total}`);
    
    for (let i = 0; i < total; i++) {
      console.log(`[${i}] Querying document at skip=${i}...`);
      console.time(`skip_${i}`);
      const docs = await db.collection('staffs').find({}).skip(i).limit(1).toArray();
      console.timeEnd(`skip_${i}`);
      if (docs.length > 0) {
        const doc = docs[0];
        console.log(` -> SUCCESS! ID: ${doc._id} | EMAIL: ${doc.email} | NAME: ${doc.fullName}`);
      } else {
        console.log(` -> EMPTY at index ${i}`);
      }
    }
    console.log('SCAN COMPLETED! No corruption found.');
  } catch (err) {
    console.error('ERROR during scan:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

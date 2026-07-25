require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Scanning staffs collection document-by-document...');
    const db = client.db('payslip_generator');
    
    let count = 0;
    const cursor = db.collection('staffs').find({});
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      count++;
      console.log(`[${count}] ID: ${doc._id} | EMAIL: ${doc.email} | NAME: ${doc.fullName}`);
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

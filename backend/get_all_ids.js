require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Fetching only _ids from staffs collection...');
    const db = client.db('payslip_generator');
    
    console.time('fetch_ids');
    const list = await db.collection('staffs').find({}).project({ _id: 1 }).toArray();
    console.timeEnd('fetch_ids');
    
    console.log('SUCCESS! ALL IDS:');
    list.forEach((doc, idx) => {
      console.log(`[${idx}] ID: ${doc._id}`);
    });
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

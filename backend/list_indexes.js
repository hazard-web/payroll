require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Listing indexes on staffs collection...');
    const db = client.db('payslip_generator');
    const indexes = await db.collection('staffs').indexes();
    console.log('INDEXES:');
    console.log(JSON.stringify(indexes, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

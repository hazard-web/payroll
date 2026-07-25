require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Dropping index email_1...');
    const db = client.db('payslip_generator');
    try {
      await db.collection('staffs').dropIndex('email_1');
      console.log('Successfully dropped index email_1!');
    } catch (indexErr) {
      console.log('Index drop failed or index does not exist:', indexErr.message);
    }
    
    console.log('Querying for staff vg810200@gmail.com after dropping index...');
    console.time('query_time');
    const s = await db.collection('staffs').findOne({ email: 'vg810200@gmail.com' });
    console.timeEnd('query_time');
    
    console.log('RESULT:', s ? 'FOUND' : 'NOT_FOUND');
    if (s) {
      console.log('NAME:', s.fullName);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

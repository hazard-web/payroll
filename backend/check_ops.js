require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to client...');
    await client.connect();
    console.log('Connected! Checking current operations...');
    const adminDb = client.db('admin');
    const ops = await adminDb.command({ currentOp: 1, active: true });
    console.log('ACTIVE OPERATIONS:');
    console.log(JSON.stringify(ops, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

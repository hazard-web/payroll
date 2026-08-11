require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to database...');
    await client.connect();
    const db = client.db('payslip_generator');
    const col = db.collection('staffs');
    
    console.log('Listing current indexes:');
    let indexes = await col.indexes();
    console.log(indexes.map(idx => idx.name));
    
    if (indexes.some(idx => idx.name === 'user_1_email_1')) {
      console.log('Dropping user_1_email_1 index...');
      await col.dropIndex('user_1_email_1');
      console.log('Dropped user_1_email_1!');
    }
    
    if (indexes.some(idx => idx.name === 'email_1')) {
      console.log('Dropping non-unique email_1 index...');
      await col.dropIndex('email_1');
      console.log('Dropped email_1!');
    }
    
    console.log('Creating unique index on email...');
    await col.createIndex({ email: 1 }, { unique: true, name: 'email_1' });
    console.log('Created unique index email_1 successfully!');
    
    console.log('Updated indexes:');
    indexes = await col.indexes();
    console.log(JSON.stringify(indexes, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    process.exit(0);
  }
})();

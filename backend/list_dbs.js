require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    console.log('Connecting to Atlas...');
    await client.connect();
    console.log('Connected! Listing databases...');
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    console.log('DATABASES:');
    for (const dbInfo of dbs.databases) {
      console.log(`- ${dbInfo.name} (${dbInfo.sizeOnDisk} bytes)`);
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      console.log('  Collections:', collections.map(c => c.name).join(', '));
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
    console.log('Done!');
    process.exit(0);
  }
})();

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('Connected! Querying collection...');
    
    // Fetch all documents from the staffs collection directly using raw driver
    const list = await mongoose.connection.db.collection('staffs').find({}).toArray();
    console.log(`TOTAL DOCUMENTS IN STAFFS: ${list.length}`);
    list.forEach(doc => {
      console.log(`- Email: ${doc.email}, Name: ${doc.fullName}, isPortalEnabled: ${doc.isPortalEnabled}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('Done!');
    process.exit(0);
  }
})();

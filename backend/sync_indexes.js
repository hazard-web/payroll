const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const modelsDir = path.join(__dirname, 'models');
    const files = fs.readdirSync(modelsDir);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const model = require(path.join(modelsDir, file));
        if (model && model.modelName) {
          console.log('Syncing indexes for ' + model.modelName);
          await model.syncIndexes();
        }
      }
    }
    console.log('All indexes synced successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();

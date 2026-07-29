const mongoose = require('mongoose');

const uri = "mongodb+srv://rohit_db_user:RohitMongo2026%40@helpassistcluster.0x7gybw.mongodb.net/payslip_generator?retryWrites=true&w=majority&appName=HelpAssistCluster";

(async () => {
  try {
    console.log("Connecting to live db...");
    await mongoose.connect(uri);
    console.log("Connected.");
    
    // Get staff collection directly
    const db = mongoose.connection.db;
    const staffs = await db.collection('staffs').find({}).toArray();
    console.log(`TOTAL STAFF IN LIVE DB: ${staffs.length}`);
    staffs.forEach(s => {
      console.log(`- ${s.fullName} (${s.email})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const staffs = await db.collection('staffs').find({}).toArray();
  console.log('--- Initializing Staff Leave Balances from Leave Policies ---');
  
  for (const s of staffs) {
    // Find company leave policy
    const policy = await db.collection('leavepolicies').findOne({ user: s.user });
    
    const casualLimit = policy?.casualLeave?.daysPerYear ?? 12;
    const sickLimit = policy?.sickLeave?.daysPerYear ?? 12;
    
    let needsUpdate = false;
    const currentBalance = s.leaveBalance || {};
    const updatedBalance = { ...currentBalance };
    
    if (currentBalance.casual === undefined || currentBalance.casual === null) {
      updatedBalance.casual = casualLimit;
      needsUpdate = true;
    }
    
    if (currentBalance.sick === undefined || currentBalance.sick === null) {
      updatedBalance.sick = sickLimit;
      needsUpdate = true;
    }
    
    // For test accounts with 0 balance, let's also initialize them to the policy default
    if (currentBalance.casual === 0 && currentBalance.sick === 0) {
      updatedBalance.casual = casualLimit;
      updatedBalance.sick = sickLimit;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await db.collection('staffs').updateOne(
        { _id: s._id },
        { $set: { leaveBalance: updatedBalance } }
      );
      console.log(`Initialized leave balance for ${s.fullName} (${s.email}) to CL: ${updatedBalance.casual}, SL: ${updatedBalance.sick}`);
    } else {
      console.log(`Skipped ${s.fullName} (${s.email}) - Already has CL: ${currentBalance.casual}, SL: ${currentBalance.sick}`);
    }
  }
  
  await client.close();
  console.log('\nLeave balances initialization complete!');
  process.exit(0);
})();

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const adminId = new ObjectId('6a3419389b27bc77f4533f7f');
  console.log(`Searching attendances where admin is ${adminId}...`);
  const attendances = await db.collection('attendances').find({ admin: adminId }).toArray();
  console.log(`Found ${attendances.length} attendance records.`);
  
  if (attendances.length > 0) {
    const staffIds = [...new Set(attendances.map(a => String(a.staff)))];
    console.log('Staff IDs associated with these attendances:', staffIds);
    
    // For each staff ID, check if it exists in staffs collection
    for (const sId of staffIds) {
      const staff = await db.collection('staffs').findOne({ _id: new ObjectId(sId) });
      console.log(`Staff ID: ${sId} -> ${staff ? `FOUND (Name: ${staff.fullName}, Email: ${staff.email})` : 'NOT FOUND (Deleted)'}`);
    }
  }

  await client.close();
  process.exit(0);
})();

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const TARGET_IDS = [
  '6a33a1d2611e3c2c81276c4c',
  '6a35323f0044a86f148bea78',
  '6a352af0a7a8a1f2f13883b6',
  '6a364a0b7e4ea565a329bdf6',
  '6a3d0bd38a1ea765d118c5fb',
  '6a423c9b35fd8bb7e588f0bb',
  '6a4243aa60ad3ab64d164fb4',
  '6a424b313e9f34a33e4aca52',
  '6a3610d3f768e9ad963d2a62'
];

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  const collections = await db.listCollections().toArray();
  console.log('--- Scanning all collections for targeted staff IDs ---');
  
  for (const col of collections) {
    const colName = col.name;
    const count = await db.collection(colName).countDocuments({});
    console.log(`\nCollection: ${colName} (${count} documents)`);
    
    for (const sId of TARGET_IDS) {
      const oid = new ObjectId(sId);
      // Search for fields containing this ID
      const query = {
        $or: [
          { _id: oid },
          { staff: oid },
          { staffId: oid },
          { staff: sId },
          { staffId: sId }
        ]
      };
      const found = await db.collection(colName).find(query).limit(3).toArray();
      if (found.length > 0) {
        console.log(`  -> Found target ${sId} in ${colName}:`);
        console.log(JSON.stringify(found, null, 2));
      }
    }
  }

  await client.close();
  process.exit(0);
})();

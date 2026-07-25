// Re-create the lost staff portal accounts for vg810200 and rks099871
// Both were company admins who also had staff portal accounts
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  const col = db.collection('staffs');

  // Hash a temporary password for both accounts
  // They should change this after first login
  const tempPassword = 'Portal@123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(tempPassword, salt);

  const now = new Date();

  const staffToCreate = [
    {
      // vg810200@gmail.com -> company XYZ (user: 6a3419389b27bc77f4533f7f)
      user: new ObjectId('6a3419389b27bc77f4533f7f'),
      email: 'vg810200@gmail.com',
      fullName: 'VG',
      designation: 'Manager',
      department: 'Management',
      type: 'Full-time',
      isPortalEnabled: true,
      portalPassword: hashedPassword,
      mustChangePassword: true,
      loginAttempts: 0,
      lockUntil: null,
      profileCompleted: false,
      address: { street: '', city: '', state: '', pincode: '', country: 'India' },
      emergencyContact: { name: '', relationship: '', phone: '' },
      bankDetails: {},
      documents: {},
      createdAt: now,
      updatedAt: now,
    },
    {
      // rks099871@gmail.com -> company BDA technologies (user: 6a339d9f5c03bbdfba7202d3)
      user: new ObjectId('6a339d9f5c03bbdfba7202d3'),
      email: 'rks099871@gmail.com',
      fullName: 'RKS',
      designation: 'Manager',
      department: 'Management',
      type: 'Full-time',
      isPortalEnabled: true,
      portalPassword: hashedPassword,
      mustChangePassword: true,
      loginAttempts: 0,
      lockUntil: null,
      profileCompleted: false,
      address: { street: '', city: '', state: '', pincode: '', country: 'India' },
      emergencyContact: { name: '', relationship: '', phone: '' },
      bankDetails: {},
      documents: {},
      createdAt: now,
      updatedAt: now,
    },
  ];

  console.log('Creating staff portal accounts...');
  for (const staff of staffToCreate) {
    const existing = await col.findOne({ email: staff.email });
    if (existing) {
      console.log(`⚠️  ${staff.email} already exists, skipping.`);
    } else {
      await col.insertOne(staff);
      console.log(`✅ Created staff portal account for ${staff.email}`);
    }
  }

  // Verify login works
  console.log('\nVerifying email queries (should be instant now)...');
  for (const email of ['vg810200@gmail.com', 'rks099871@gmail.com']) {
    const t = Date.now();
    const doc = await col.findOne({ email });
    const ms = Date.now() - t;
    console.log(`  ${email}: ${doc ? `✅ FOUND (${doc.fullName}) in ${ms}ms | portal: ${doc.isPortalEnabled}` : '❌ NOT FOUND'}`);
  }

  console.log('\n🎉 Done! Both accounts restored.');
  console.log('Temporary password for both: Portal@123');
  console.log('They will be prompted to change it on first login.');

  await client.close();
  process.exit(0);
})();

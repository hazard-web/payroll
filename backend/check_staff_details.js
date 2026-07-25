require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');

  // Full details of current staff records
  const staffs = await db.collection('staffs').find({}).toArray();
  console.log(`Total staff: ${staffs.length}\n`);
  
  staffs.forEach((s, i) => {
    console.log(`[${i}] ${s.email} | ${s.fullName}`);
    console.log(`    user: ${s.user}`);
    console.log(`    designation: ${s.designation || 'NOT SET'} | dept: ${s.department || 'NOT SET'}`);
    console.log(`    type: ${s.type || 'NOT SET'} | joiningDate: ${s.joiningDate || 'NOT SET'}`);
    console.log(`    employeeId: ${s.employeeId || 'NOT SET'}`);
    console.log(`    pfNumber: ${s.pfNumber || 'NOT SET'}`);
    console.log(`    panNumber: ${s.panNumber || 'NOT SET'}`);
    console.log(`    dob: ${s.dob || 'NOT SET'}`);
    console.log(`    gender: ${s.gender || 'NOT SET'}`);
    console.log(`    address: ${JSON.stringify(s.address || {})}`);
    console.log(`    bankDetails: ${JSON.stringify(s.bankDetails || {})}`);
    console.log(`    salaryDetails: ${JSON.stringify(s.salaryDetails || {})}`);
    console.log(`    profileCompleted: ${s.profileCompleted}`);
    console.log(`    isPortalEnabled: ${s.isPortalEnabled}`);
    console.log('');
  });

  // Also check payslips to find any salary data for lost staff
  console.log('\n=== PAYSLIPS (all) ===');
  const payslips = await db.collection('payslips').find({}).project({
    staffName: 1, staffEmail: 1, designation: 1, department: 1, 
    basicSalary: 1, netPay: 1, staff: 1, month: 1, year: 1
  }).limit(30).toArray();
  payslips.forEach(p => {
    console.log(`  ${p.staffEmail} | ${p.staffName} | ${p.designation} | Basic: ${p.basicSalary} | Net: ${p.netPay} | staffId: ${p.staff}`);
  });

  await client.close();
  process.exit(0);
})();

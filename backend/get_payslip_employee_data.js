require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');

  // Get all payslips with full employee details
  const payslips = await db.collection('payslips').find({}).project({
    employeeName: 1, employeeEmail: 1, designation: 1, department: 1,
    basicSalary: 1, netSalary: 1, grossEarnings: 1, annualCTC: 1,
    user: 1, employeeId: 1, bankAccount: 1, bankName: 1, panNumber: 1,
    pfNumber: 1, month: 1, year: 1, employmentType: 1
  }).toArray();

  // Group by employee email
  const byEmail = {};
  for (const p of payslips) {
    const email = p.employeeEmail;
    if (!byEmail[email]) byEmail[email] = [];
    byEmail[email].push(p);
  }

  console.log('=== PAYSLIP DATA BY EMPLOYEE ===');
  for (const [email, records] of Object.entries(byEmail)) {
    const r = records[0]; // use first record for static data
    console.log(`\nEmployee: ${email}`);
    console.log(`  Name: ${r.employeeName}`);
    console.log(`  Designation: ${r.designation} | Dept: ${r.department}`);
    console.log(`  Employee ID: ${r.employeeId}`);
    console.log(`  PAN: ${r.panNumber}`);
    console.log(`  PF: ${r.pfNumber}`);
    console.log(`  Bank: ${r.bankName} | Account: ${r.bankAccount}`);
    console.log(`  Annual CTC: ${r.annualCTC}`);
    console.log(`  User (company): ${r.user}`);
    console.log(`  Records: ${records.length} payslip(s)`);
  }

  await client.close();
  process.exit(0);
})();

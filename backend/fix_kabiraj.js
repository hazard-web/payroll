require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');

  // Update kabirajrudranath with full payslip data
  const r = await db.collection('staffs').updateOne(
    { email: 'kabirajrudranath@gmail.com' },
    {
      $set: {
        panNumber: 'EXZXP0007H',
        pfNumber: '02/10/2000',
        employeeId: 'EID001',
        bankDetails: {
          accountHolderName: 'RUDRANATH KABIRAJ',
          bankName: 'SBI',
          accountNumber: '9064851835000',
          ifscCode: '',
          branch: '',
        },
        salaryDetails: { annualCTC: 450000, baseSalary: 18750 },
        type: 'Employee',
        joiningDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }
    }
  );
  console.log('Updated kabirajrudranath:', r.modifiedCount, 'doc(s)');

  const s = await db.collection('staffs').findOne({ email: 'kabirajrudranath@gmail.com' });
  console.log('PAN:', s.panNumber, '| PF:', s.pfNumber, '| Bank:', s.bankDetails?.bankName);

  await client.close();
  process.exit(0);
})();

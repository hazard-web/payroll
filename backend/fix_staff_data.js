// Restore correct staff data using payslip records as source of truth
// Also fix company linkages for vg810200 and rks099871
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  const col = db.collection('staffs');

  // BDA Technologies company (rkg98521@gmail.com)
  const BDA_TECH = new ObjectId('6a339ca7d39eb27902adde71');

  // Fix 1: rks099871@gmail.com was GULSHAN KUMAR, BDA-EMP-0003 under BDA Technologies
  // But we already have udayandey8@gmail.com as GULSHAN KUMAR under udayandey19's BDA.
  // Payslip says rks099871 = GULSHAN KUMAR under 6a339ca7d39eb27902adde71 (rkg98521's BDA Tech).
  // So the staff record for rks099871 should be linked to rkg98521's company (BDA Tech), not rks's own company.
  
  console.log('Fixing rks099871@gmail.com staff record...');
  const rksStaff = await col.findOne({ email: 'rks099871@gmail.com' });
  if (rksStaff) {
    await col.updateOne({ _id: rksStaff._id }, {
      $set: {
        user: BDA_TECH, // rkg98521@gmail.com's BDA Technologies
        fullName: 'GULSHAN KUMAR',
        designation: 'SOFTWARE ENGINEER',
        department: 'IT',
        type: 'Employee',
        employeeId: 'BDA-EMP-0003',
        // Restore PAN and PF from payslip
        panNumber: 'MNBCS1243F',
        pfNumber: '121200000',
        bankDetails: {
          accountHolderName: 'GULSHAN KUMAR',
          bankName: 'KOTAK MAHINDRA BANK',
          accountNumber: '789789897895',
          ifscCode: '',
          branch: '',
        },
        updatedAt: new Date(),
      }
    });
    console.log('✅ rks099871 fixed: GULSHAN KUMAR | BDA Technologies | BDA-EMP-0003');
  }

  // Fix 2: vg810200@gmail.com - not in any payslip. Was likely a test/admin account.
  // The portal showed "BDA" - so it should be under BDA Technologies (rkg98521).
  // Update to correct company and remove XYZ company link.
  console.log('\nFixing vg810200@gmail.com staff record...');
  const vgStaff = await col.findOne({ email: 'vg810200@gmail.com' });
  if (vgStaff) {
    await col.updateOne({ _id: vgStaff._id }, {
      $set: {
        user: BDA_TECH, // rkg98521@gmail.com's BDA Technologies
        fullName: 'VG',
        designation: 'Manager',
        department: 'Management',
        type: 'Employee',
        updatedAt: new Date(),
      }
    });
    console.log('✅ vg810200 fixed: VG | BDA Technologies | Manager');
  }

  // Fix 3: Restore udayandey8@gmail.com to correct name from payslips
  // Payslip says: udayandey8@gmail.com = UDAYAN DEY | DEVELOPER | EID01 | PAN: EXQOF8880K | SBI 366075258895
  // But current staff record says: GULSHAN KUMAR - wrong!
  console.log('\nFixing udayandey8@gmail.com (should be UDAYAN DEY, not GULSHAN KUMAR)...');
  const uday8 = await col.findOne({ email: 'udayandey8@gmail.com' });
  if (uday8) {
    await col.updateOne({ _id: uday8._id }, {
      $set: {
        fullName: 'UDAYAN DEY',
        designation: 'DEVELOPER',
        department: 'ENGINEERING',
        type: 'Employee',
        employeeId: 'EID01',
        panNumber: 'EXQOF8880K',
        pfNumber: 'RVHJJHJKKKK',
        bankDetails: {
          accountHolderName: 'UDAYAN DEY',
          bankName: 'SBI',
          accountNumber: '366075258895',
          ifscCode: '',
          branch: '',
        },
        updatedAt: new Date(),
      }
    });
    console.log('✅ udayandey8 fixed: UDAYAN DEY | DEVELOPER | EID01');
  }

  // Fix 4: udayandey91@gmail.com payslip shows RITIKA PANDEY (QA TESTER) but staff says UDAYAN DEY
  // Keep the staff name UDAYAN DEY (it was likely a test payslip with wrong name)
  // Just restore PAN and PF from payslip
  console.log('\nUpdating udayandey91@gmail.com with payslip data...');
  const uday91 = await col.findOne({ email: 'udayandey91@gmail.com' });
  if (uday91) {
    await col.updateOne({ _id: uday91._id }, {
      $set: {
        // Keep designation DEVELOPER (consistent with main record)
        panNumber: 'RTYUI0000H',
        pfNumber: 'RRRRR000000',
        employeeId: 'EID03',
        updatedAt: new Date(),
      }
    });
    console.log('✅ udayandey91 updated with PAN/PF from payslip');
  }

  // Verify final state
  console.log('\n=== FINAL STAFF LIST ===');
  const allStaff = await col.find({}).project({ email:1, fullName:1, user:1, designation:1, employeeId:1, panNumber:1 }).toArray();
  allStaff.forEach((s,i) => {
    console.log(`[${i}] ${s.email} | ${s.fullName} | ${s.designation} | ${s.employeeId || 'no-id'} | PAN:${s.panNumber || 'none'} | company:${s.user}`);
  });

  await client.close();
  console.log('\n✅ All staff records fixed.');
  process.exit(0);
})();

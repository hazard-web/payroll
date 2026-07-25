require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const NEW_STAFF_ID = new ObjectId('6a633e762efcd430631526b6');
const OLD_STAFF_ID = new ObjectId('6a423c9b35fd8bb7e588f0bb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('payslip_generator');
  
  console.log('--- Migrating Vikash Kumar database records ---');

  // Step 1: Update designation, department, and employee ID in staffs collection
  const staffUpdate = await db.collection('staffs').updateOne(
    { _id: NEW_STAFF_ID },
    {
      $set: {
        fullName: 'Vikash Kumar',
        designation: 'SOFTWARE ENGINEER',
        department: 'IT',
        employeeId: 'BDA-EMP-0010'
      }
    }
  );
  console.log(`Updated Vikash Kumar profile: matched=${staffUpdate.matchedCount}, modified=${staffUpdate.modifiedCount}`);

  // Step 2: Migrate attendance records
  const attendanceMigration = await db.collection('attendances').updateMany(
    { staff: OLD_STAFF_ID },
    { $set: { staff: NEW_STAFF_ID } }
  );
  console.log(`Migrated attendances: matched=${attendanceMigration.matchedCount}, modified=${attendanceMigration.modifiedCount}`);

  // Step 3: Migrate leave requests
  const leaveMigration = await db.collection('leaverequests').updateMany(
    { staff: OLD_STAFF_ID },
    { $set: { staff: NEW_STAFF_ID } }
  );
  console.log(`Migrated leave requests: matched=${leaveMigration.matchedCount}, modified=${leaveMigration.modifiedCount}`);

  // Step 4: Migrate notifications
  const notificationMigration = await db.collection('notifications').updateMany(
    { staff: OLD_STAFF_ID },
    { $set: { staff: NEW_STAFF_ID } }
  );
  console.log(`Migrated notifications: matched=${notificationMigration.matchedCount}, modified=${notificationMigration.modifiedCount}`);

  // Step 5: Verify the new record counts
  console.log('\n--- Verifying Active Records for New ID ---');
  const activeStaff = await db.collection('staffs').findOne({ _id: NEW_STAFF_ID });
  console.log(`Staff Record: ${activeStaff.fullName} | ${activeStaff.designation} | ${activeStaff.department} | ${activeStaff.employeeId}`);
  
  const activeAttendances = await db.collection('attendances').countDocuments({ staff: NEW_STAFF_ID });
  console.log(`Attendances Count: ${activeAttendances}`);
  
  const activeLeaves = await db.collection('leaverequests').countDocuments({ staff: NEW_STAFF_ID });
  console.log(`Leave Requests Count: ${activeLeaves}`);

  const activeNotifications = await db.collection('notifications').countDocuments({ staff: NEW_STAFF_ID });
  console.log(`Notifications Count: ${activeNotifications}`);

  await client.close();
  console.log('\nMigration successfully finished!');
  process.exit(0);
})();

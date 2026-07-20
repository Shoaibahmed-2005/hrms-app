import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding manager-only HRMS (Labour Edition)...');

  // Company settings
  await prisma.companySetting.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      faceMatchThreshold: 0.55,
      shiftStart: '09:00',
      shiftEnd: '18:00',
      halfDayThresholdHours: 4.0,
      fullDayHours: 8.0,
    }
  });

  // Manager account
  const hash = await bcrypt.hash('Manager@123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@demohrms.com' },
    update: {},
    create: {
      email: 'manager@demohrms.com',
      passwordHash: hash,
      role: 'MANAGER',
      mustResetPassword: false,
    }
  });
  console.log('✅ Manager:', manager.email);

  // Demo employees (labour workers)
  const employees = [
    { name: 'Ramu', code: 'LAB-001', dept: 'Construction', designation: 'Mason', paymentType: 'HOURLY' as const, hourlyRate: 80, photo: 'https://i.pravatar.cc/150?img=11' },
    { name: 'Shyam Lal', code: 'LAB-002', dept: 'Finishing', designation: 'Painter', paymentType: 'HOURLY' as const, hourlyRate: 70, photo: 'https://i.pravatar.cc/150?img=12' },
    { name: 'Babulal', code: 'LAB-003', dept: 'Plumbing', designation: 'Plumber', paymentType: 'MONTHLY' as const, baseSalary: 18000, photo: 'https://i.pravatar.cc/150?img=13' },
    { name: 'Suresh Kumar', code: 'LAB-004', dept: 'Electrical', designation: 'Electrician', paymentType: 'MONTHLY' as const, baseSalary: 20000, photo: 'https://i.pravatar.cc/150?img=14' },
    { name: 'Ramesh', code: 'LAB-005', dept: 'General', designation: 'Helper', paymentType: 'HOURLY' as const, hourlyRate: 50, photo: 'https://i.pravatar.cc/150?img=15' },
    { name: 'Hari Om', code: 'LAB-006', dept: 'General', designation: 'Helper', paymentType: 'HOURLY' as const, hourlyRate: 50, photo: 'https://i.pravatar.cc/150?img=16' },
    { name: 'Govind', code: 'LAB-007', dept: 'Construction', designation: 'Site Supervisor', paymentType: 'MONTHLY' as const, baseSalary: 25000, photo: 'https://i.pravatar.cc/150?img=59' },
    { name: 'Kishan', code: 'LAB-008', dept: 'Finishing', designation: 'Carpenter', paymentType: 'HOURLY' as const, hourlyRate: 90, photo: 'https://i.pravatar.cc/150?img=60' },
  ];

  const createdEmployees: any[] = [];
  for (const emp of employees) {
    const created = await prisma.employee.upsert({
      where: { employeeCode: emp.code },
      update: {},
      create: {
        employeeCode: emp.code,
        name: emp.name,
        department: emp.dept,
        designation: emp.designation,
        dateOfJoining: new Date('2024-01-15'),
        paymentType: emp.paymentType,
        baseSalary: emp.paymentType === 'MONTHLY' ? (emp as any).baseSalary : null,
        hourlyRate: emp.paymentType === 'HOURLY' ? (emp as any).hourlyRate : null,
        status: 'ACTIVE',
        phone: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
        photoUrl: emp.photo,
        govtId: `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
      }
    });
    createdEmployees.push(created);
    console.log(`  👤 ${created.name} (${created.designation})`);
  }

  // Past attendance (last 14 working days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let dayOffset = 13; dayOffset >= 1; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dow = date.getDay();
    if (dow === 0) continue; // skip Sundays only for labourers

    for (const emp of createdEmployees) {
      const absent = Math.random() < 0.1; // 10% absence rate
      if (absent) continue;

      const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9am
      const checkInMin = Math.floor(Math.random() * 60);
      const hoursWorked = 6 + Math.random() * 4; // 6-10 hours
      const isHalfDay = hoursWorked < 5;
      const checkIn = new Date(date);
      checkIn.setHours(checkInHour, checkInMin, 0, 0);
      const checkOut = new Date(checkIn.getTime() + hoursWorked * 3600 * 1000);
      const isLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 15);

      let dailyEarnings = 0;
      if (emp.paymentType === 'HOURLY' && emp.hourlyRate) {
        dailyEarnings = hoursWorked * emp.hourlyRate;
      } else if (emp.baseSalary) {
        const dailyRate = emp.baseSalary / 26;
        dailyEarnings = isHalfDay ? dailyRate / 2 : dailyRate;
      }
      dailyEarnings = Math.round(dailyEarnings * 100) / 100;
      
      // Random extra wages
      let extraWages = 0;
      if (Math.random() > 0.8) {
        extraWages = Math.floor(Math.random() * 5) * 50 + 50; // 50 to 250 extra
      }

      try {
        await prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: {},
          create: {
            employeeId: emp.id,
            date,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            isHalfDay,
            dailyEarnings,
            extraWages: extraWages > 0 ? extraWages : null,
            status: isLate ? 'LATE' : 'PRESENT',
            faceMatchScore: 0.75 + Math.random() * 0.2,
          }
        });
      } catch (_) {}
    }
  }
  console.log('✅ Attendance records seeded');

  // Announcement
  await prisma.announcement.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      title: 'Welcome to the new HRMS',
      body: 'The system has been updated. Manager now handles all attendance and extra wages payouts.',
      createdById: manager.id,
    }
  });

  console.log('\n🎉 Seeding complete!');
  console.log('─────────────────────────────────────────');
  console.log('Manager login:');
  console.log('  Email:    manager@demohrms.com');
  console.log('  Password: Manager@123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

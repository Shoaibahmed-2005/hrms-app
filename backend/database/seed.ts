import { PrismaClient, Role, EmployeeStatus, AttendanceStatus, LeaveStatus, PayrollStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.payrollEntry.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.faceEmbedding.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySetting.deleteMany();

  // 1. Company Settings
  await prisma.companySetting.create({
    data: {
      geofenceLat: 37.7749,
      geofenceLng: -122.4194,
      geofenceRadiusM: 50,
      faceMatchThreshold: 0.6,
      shiftStart: "09:00",
      shiftEnd: "17:00",
      overtimeRate: 1.5,
      overtimeOffsetsLeave: false
    }
  });

  // 2. Leave Types
  const leaveTypes = await Promise.all([
    prisma.leaveType.create({ data: { name: 'Sick', defaultAnnualDays: 10 } }),
    prisma.leaveType.create({ data: { name: 'Casual', defaultAnnualDays: 10 } }),
    prisma.leaveType.create({ data: { name: 'Earned', defaultAnnualDays: 15 } }),
    prisma.leaveType.create({ data: { name: 'Unpaid', defaultAnnualDays: 0 } }),
  ]);

  // 3. Create Manager
  const managerPasswordHash = await bcrypt.hash('Manager@123', 10);
  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@demohrms.com',
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      mustResetPassword: false,
    }
  });

  const manager = await prisma.employee.create({
    data: {
      userId: managerUser.id,
      employeeCode: 'EMP001',
      name: 'Alice Johnson',
      phone: '+1234567890',
      department: 'Management',
      designation: 'HR Manager',
      dateOfJoining: new Date('2020-01-15'),
      baseSalary: 120000,
      photoUrl: 'https://i.pravatar.cc/150?u=EMP001',
    }
  });

  // 4. Create Employees
  const departments = ['Engineering', 'Sales', 'HR', 'Support'];
  const employeePasswordHash = await bcrypt.hash('Employee@123', 10);
  const employees = [];
  
  for (let i = 2; i <= 15; i++) {
    const dep = departments[i % departments.length];
    const user = await prisma.user.create({
      data: {
        email: `employee${i}@demohrms.com`,
        passwordHash: employeePasswordHash,
        role: Role.EMPLOYEE,
        mustResetPassword: true,
      }
    });

    const emp = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: `EMP${i.toString().padStart(3, '0')}`,
        name: `Employee Name ${i}`,
        phone: `+198765432${i.toString().padStart(2, '0')}`,
        department: dep,
        designation: `${dep} Specialist`,
        dateOfJoining: new Date(`202${(i % 3) + 1}-0${(i % 9) + 1}-10`),
        baseSalary: 50000 + (i * 2000),
        reportingToId: manager.id,
        photoUrl: `https://i.pravatar.cc/150?u=EMP${i}`,
      }
    });
    employees.push(emp);
  }

  const allEmployees = [manager, ...employees];

  // 5. Leave Balances for 2024
  for (const emp of allEmployees) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: 2024,
          balanceDays: lt.defaultAnnualDays
        }
      });
    }
  }

  // 6. Attendance Records (Last 60 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const emp of allEmployees) {
    for (let i = 60; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const rand = Math.random();
      let status = AttendanceStatus.PRESENT;
      let checkIn = new Date(date);
      let checkOut = new Date(date);
      
      if (rand < 0.05) {
        status = AttendanceStatus.ABSENT;
        checkIn = null as any;
        checkOut = null as any;
      } else if (rand < 0.15) {
        status = AttendanceStatus.LATE;
        checkIn.setHours(9, 30 + Math.floor(Math.random() * 60), 0);
        checkOut.setHours(17, 0, 0);
      } else {
        checkIn.setHours(8, 45 + Math.floor(Math.random() * 15), 0);
        // Overtime check
        if (rand > 0.9) {
          checkOut.setHours(18, 30 + Math.floor(Math.random() * 60), 0);
        } else {
          checkOut.setHours(17, 0, 0);
        }
      }

      const hoursWorked = status !== AttendanceStatus.ABSENT 
        ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
        : 0;

      await prisma.attendanceRecord.create({
        data: {
          employeeId: emp.id,
          date: date,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          status,
          hoursWorked,
          faceMatchScore: status !== AttendanceStatus.ABSENT ? 0.95 : null,
          checkInLat: status !== AttendanceStatus.ABSENT ? 37.7749 : null,
          checkInLng: status !== AttendanceStatus.ABSENT ? -122.4194 : null,
        }
      });
    }
  }

  // 7. Leave Requests
  for (let i = 0; i < 15; i++) {
    const emp = employees[i % employees.length];
    const lt = leaveTypes[i % leaveTypes.length];
    const sd = new Date();
    sd.setDate(sd.getDate() + i);
    
    let status = LeaveStatus.PENDING;
    if (i % 3 === 1) status = LeaveStatus.APPROVED;
    if (i % 3 === 2) status = LeaveStatus.REJECTED;

    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: lt.id,
        startDate: sd,
        endDate: new Date(sd),
        reason: 'Personal reason',
        status,
        reviewedById: status !== LeaveStatus.PENDING ? managerUser.id : null,
      }
    });
  }

  // 8. Payroll Periods
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  
  const periods = [
    { m: currentMonth - 2, y: currentYear, s: PayrollStatus.PAID },
    { m: currentMonth - 1, y: currentYear, s: PayrollStatus.FINALIZED },
    { m: currentMonth, y: currentYear, s: PayrollStatus.DRAFT },
  ];

  for (const p of periods) {
    let month = p.m;
    let year = p.y;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    
    const pp = await prisma.payrollPeriod.create({
      data: { month, year, status: p.s }
    });

    for (const emp of allEmployees) {
      await prisma.payrollEntry.create({
        data: {
          payrollPeriodId: pp.id,
          employeeId: emp.id,
          gross: emp.baseSalary / 12,
          leaveDeduction: 0,
          halfDayDeduction: 0,
          overtimePay: Math.floor(Math.random() * 500),
          netPay: (emp.baseSalary / 12) + 200,
        }
      });
    }
  }

  // 9. Announcements
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the new HRMS',
      body: 'We are glad to launch our new system.',
      createdById: managerUser.id,
    }
  });

  // 10. Notifications and Chat Messages
  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      type: 'LEAVE',
      message: 'New leave request pending approval.',
    }
  });

  await prisma.chatMessage.create({
    data: {
      senderId: employees[0].id,
      receiverId: manager.id,
      message: 'Hello, I have submitted my leave request.',
    }
  });

  console.log('Seeding completed.');
  console.log('--- Manager Credentials ---');
  console.log('Email: manager@demohrms.com');
  console.log('Password: Manager@123');
  console.log('---------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

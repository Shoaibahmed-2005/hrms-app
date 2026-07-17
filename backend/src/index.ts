import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import attendanceRoutes from './routes/attendance';
import employeeRoutes from './routes/employees';
import leaveRoutes from './routes/leaves';
import payrollRoutes from './routes/payroll';
import dashboardRoutes from './routes/dashboard';
import departmentRoutes from './routes/departments';
import settingsRoutes from './routes/settings';
import reportsRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import chatRoutes from './routes/chat';
import announcementRoutes from './routes/announcements';
import faceResetRoutes from './routes/face-reset';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/face-reset', faceResetRoutes);

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

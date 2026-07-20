import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import attendanceRoutes from './routes/attendance';
import employeeRoutes from './routes/employees';
import payrollRoutes from './routes/payroll';
import settingsRoutes from './routes/settings';
import reportsRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import announcementRoutes from './routes/announcements';
import departmentRoutes from './routes/departments';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});


const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased for face descriptor payloads

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/departments', departmentRoutes);

const server = app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

// Keep reference alive to prevent GC in newer Node versions
process.on('SIGINT', () => server.close());

// Temporary fix for Windows Node 24 event loop bug
setInterval(() => {}, 60000);

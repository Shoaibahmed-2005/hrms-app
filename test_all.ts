import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as db from './src/lib/hrms-db';

dotenv.config();

// Override the supabase client in hrms-db module for the test
const testSupabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
(db as any).supabase = testSupabase;

async function testAll() {
  try {
    console.log("Testing fetchDashboardData...");
    const dashboard = await db.fetchDashboardData();
    console.log("Dashboard fetch SUCCESS. Total employees:", dashboard.totalEmployees);
  } catch (err: any) {
    console.error("Dashboard fetch ERROR:", err.message || err);
  }

  try {
    console.log("Testing fetchEmployees...");
    const employees = await db.fetchEmployees();
    console.log("Employees fetch SUCCESS. Count:", employees.length);
  } catch (err: any) {
    console.error("Employees fetch ERROR:", err.message || err);
  }
  
  try {
    console.log("Testing fetchAttendanceHistory...");
    const history = await db.fetchAttendanceHistory();
    console.log("Attendance history fetch SUCCESS. Count:", history.length);
  } catch (err: any) {
    console.error("History fetch ERROR:", err.message || err);
  }
}

testAll();

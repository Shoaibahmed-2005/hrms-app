import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function testQuery() {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("id, employee_id, date, check_in, check_out, hours_worked, status, face_confidence")
    .limit(1);

  if (error) {
    console.error("attendance_sessions Error:", error.message);
  } else {
    console.log("attendance_sessions Success:", data);
  }

  const { data: empData, error: empError } = await supabase
    .from("employees")
    .select("id, emp_code, full_name, email, role, department, phone, pay_type, salary, monthly_salary, hourly_rate, fixed_bonus, manager, initial_login, status, join_date, user_id, profile_image, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (empError) {
    console.error("employees Error:", empError.message);
  } else {
    console.log("employees Success:", empData);
  }
}

testQuery();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function migrate() {
  console.log("Starting migration of attendance to attendance_sessions...");

  // 1. Fetch default outlet or create one if none exists
  let { data: outlets } = await supabase.from('outlets').select('id, name');
  if (!outlets || outlets.length === 0) {
    const { data: newOutlet } = await supabase.from('outlets').insert({
      name: 'Default Outlet',
      latitude: 0,
      longitude: 0,
      geofence_radius_meters: 1000000 // effectively global
    }).select();
    outlets = newOutlet;
  }
  const defaultOutletId = outlets![0].id;
  console.log("Using outlet ID:", defaultOutletId);

  // 2. Fetch all old attendance rows
  let { data: oldRows, error } = await supabase.from('attendance').select('*');
  if (error) {
    console.error("Error fetching old attendance:", error);
    return;
  }
  console.log(`Found ${oldRows?.length || 0} old attendance records.`);

  if (!oldRows || oldRows.length === 0) return;

  // 3. Map to new format
  const newRows = oldRows.map(row => ({
    employee_id: row.employee_id,
    outlet_id: defaultOutletId,
    date: row.date,
    check_in: row.check_in || `${row.date}T09:00:00Z`,
    check_out: row.check_out,
    duration_hours: row.hours_worked || 0,
    status: row.status,
    created_at: row.check_in || `${row.date}T09:00:00Z`
  }));

  // 4. Insert into attendance_sessions
  const batchSize = 100;
  for (let i = 0; i < newRows.length; i += batchSize) {
    const batch = newRows.slice(i, i + batchSize);
    const { error: insertError } = await supabase.from('attendance_sessions').insert(batch);
    if (insertError) {
      console.error("Error inserting batch:", insertError);
    } else {
      console.log(`Inserted batch ${i} to ${i + batch.length}`);
    }
  }

  console.log("Migration complete!");
}

migrate();

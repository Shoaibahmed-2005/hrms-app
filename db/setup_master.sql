-- =====================================================================================
-- MASTER SCHEMA INITIALIZATION SCRIPT FOR CLEANS HRMS
-- This script safely drops everything and reconstructs the entire database schema
-- including tables, triggers, RPC functions, RLS policies, and dummy data.
-- =====================================================================================

-- 1. CLEAN SLATE: Drop the public schema and recreate it
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('manager', 'employee');

-- 3. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
END;
$$;

-- 4. TABLES

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  is_super_admin boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'employee',
  UNIQUE (user_id, role)
);

-- OUTLETS
CREATE TABLE public.outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geofence_radius_meters numeric NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- KIOSK DEVICES
CREATE TABLE public.kiosk_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  device_secret uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- EMPLOYEES
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL,
  department text NOT NULL,
  phone text,
  pay_type text NOT NULL DEFAULT 'monthly' CHECK (pay_type IN ('monthly', 'hourly')),
  salary numeric NOT NULL DEFAULT 0,
  monthly_salary numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  fixed_bonus numeric NOT NULL DEFAULT 0,
  manager text,
  initial_login text,
  status text NOT NULL DEFAULT 'Active',
  join_date date NOT NULL DEFAULT current_date,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ATTENDANCE SESSIONS
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  date date NOT NULL,
  check_in timestamptz NOT NULL,
  check_out timestamptz,
  hours_worked numeric NOT NULL DEFAULT 0,
  face_confidence numeric,
  status text NOT NULL DEFAULT 'Present',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FACE DESCRIPTORS
CREATE TABLE public.face_descriptors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descriptor double precision[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FACE RESET REQUESTS
CREATE TABLE public.face_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  manager_note text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- COMPANY SETTINGS
CREATE TABLE public.company_settings (
  id boolean PRIMARY KEY DEFAULT true,
  face_threshold numeric NOT NULL DEFAULT 80,
  shift_start time NOT NULL DEFAULT '09:30',
  shift_end time NOT NULL DEFAULT '18:30',
  overtime_multiplier numeric NOT NULL DEFAULT 1.5,
  attendance_cooldown_minutes integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton CHECK (id)
);
INSERT INTO public.company_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- DEPARTMENTS
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DESIGNATIONS
CREATE TABLE public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  absent_day_deduction numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- 5. RPC & TRIGGERS

-- Handle New Auth User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'employee'));
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Handle Kiosk Check-In / Check-Out
CREATE OR REPLACE FUNCTION public.mark_session_attendance(
  _device_secret uuid,
  _lat numeric,
  _long numeric,
  _employee_id uuid,
  _action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _outlet record;
  _device record;
  _distance numeric;
  _session record;
BEGIN
  SELECT * INTO _device FROM public.kiosk_devices WHERE device_secret = _device_secret AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive device secret.');
  END IF;

  SELECT * INTO _outlet FROM public.outlets WHERE id = _device.outlet_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outlet not found or inactive.');
  END IF;

  IF _lat IS NOT NULL AND _long IS NOT NULL AND _lat != 0 AND _long != 0 THEN
    _distance := 6371000 * acos(
      cos(radians(_outlet.latitude)) * cos(radians(_lat)) *
      cos(radians(_long) - radians(_outlet.longitude)) +
      sin(radians(_outlet.latitude)) * sin(radians(_lat))
    );
    IF _distance > _outlet.geofence_radius_meters THEN
      RETURN jsonb_build_object('success', false, 'error', 'Device is outside the designated outlet geofence. Distance: ' || _distance || 'm');
    END IF;
  END IF;

  IF _action = 'in' THEN
    SELECT * INTO _session FROM public.attendance_sessions 
    WHERE employee_id = _employee_id AND check_out IS NULL 
    ORDER BY check_in DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Employee already has an open session. Please check out first.');
    END IF;

    INSERT INTO public.attendance_sessions (employee_id, outlet_id, date, check_in)
    VALUES (_employee_id, _outlet.id, current_date, now());
    RETURN jsonb_build_object('success', true, 'message', 'Checked in successfully at ' || _outlet.name);

  ELSIF _action = 'out' THEN
    SELECT * INTO _session FROM public.attendance_sessions 
    WHERE employee_id = _employee_id AND check_out IS NULL 
    ORDER BY check_in DESC LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'No open session found to check out of.');
    END IF;

    UPDATE public.attendance_sessions 
    SET 
      check_out = now(),
      hours_worked = extract(epoch from (now() - check_in)) / 3600.0
    WHERE id = _session.id;
    RETURN jsonb_build_object('success', true, 'message', 'Checked out successfully at ' || _outlet.name);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action.');
  END IF;
END;
$$;


-- 6. RLS & PERMISSIONS

-- Enable RLS everywhere
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, anon;

-- Profiles & Roles Policies
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Outlets Policies (Global Manager Access)
CREATE POLICY "outlets_anon_select" ON public.outlets FOR SELECT TO anon USING (true);
CREATE POLICY "outlets_auth_select" ON public.outlets FOR SELECT TO authenticated USING (true);
CREATE POLICY "outlets_manager_write" ON public.outlets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Kiosk Policies
CREATE POLICY "devices_manager_all" ON public.kiosk_devices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Employees Policies
CREATE POLICY "employees_select_all" ON public.employees FOR SELECT USING (true);
CREATE POLICY "employees_manager_write" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Attendance Sessions Policies (Global Manager Access)
CREATE POLICY "sessions_anon_all" ON public.attendance_sessions FOR ALL TO anon USING (true) WITH CHECK(true);
CREATE POLICY "sessions_auth_select" ON public.attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_manager_write" ON public.attendance_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Face Descriptors
CREATE POLICY "face_public_select" ON public.face_descriptors FOR SELECT TO anon USING (true);
CREATE POLICY "face_manager_all" ON public.face_descriptors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Face Reset
CREATE POLICY "face_reset_self_select" ON public.face_reset_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "face_reset_self_insert" ON public.face_reset_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "face_reset_manager_all" ON public.face_reset_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Settings & Master Data
CREATE POLICY "settings_select_all" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "settings_manager_write" ON public.company_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "depts_select_all" ON public.departments FOR SELECT USING (true);
CREATE POLICY "depts_manager_write" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "desigs_select_all" ON public.designations FOR SELECT USING (true);
CREATE POLICY "desigs_manager_write" ON public.designations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));


-- 7. SEED DUMMY DATA

INSERT INTO public.outlets (name, latitude, longitude, geofence_radius_meters, active) VALUES 
  ('Adyar Branch', 13.0012, 80.2565, 50, true),
  ('Avadi Branch', 13.1143, 80.1022, 50, true);

INSERT INTO public.departments (name, active) VALUES 
  ('Cleaning Staff', true),
  ('Management', true);

INSERT INTO public.employees (emp_code, full_name, email, role, department, pay_type, monthly_salary, hourly_rate) VALUES 
  ('EMP001', 'Arun Kumar', 'arun@example.com', 'Cleaner', 'Cleaning Staff', 'hourly', 0, 150),
  ('EMP002', 'Priya Sharma', 'priya@example.com', 'Cleaner', 'Cleaning Staff', 'hourly', 0, 150),
  ('EMP003', 'Rajesh Singh', 'rajesh@example.com', 'Supervisor', 'Management', 'monthly', 35000, 0),
  ('EMP004', 'Sneha Patel', 'sneha@example.com', 'Cleaner', 'Cleaning Staff', 'hourly', 0, 150),
  ('EMP005', 'Vijay Vijay', 'vijay@example.com', 'Cleaner', 'Cleaning Staff', 'hourly', 0, 150);

INSERT INTO public.attendance_sessions (employee_id, outlet_id, date, check_in, check_out, hours_worked, status)
SELECT 
  (SELECT id FROM public.employees WHERE emp_code = 'EMP001'),
  (SELECT id FROM public.outlets WHERE name = 'Adyar Branch'),
  current_date - i,
  (current_date - i) + interval '9 hours',
  (current_date - i) + interval '17 hours',
  8.0,
  'Present'
FROM generate_series(1, 7) i;

INSERT INTO public.attendance_sessions (employee_id, outlet_id, date, check_in, check_out, hours_worked, status)
SELECT 
  (SELECT id FROM public.employees WHERE emp_code = 'EMP002'),
  (SELECT id FROM public.outlets WHERE name = 'Avadi Branch'),
  current_date - i,
  (current_date - i) + interval '9 hours 30 minutes',
  (current_date - i) + interval '17 hours 30 minutes',
  8.0,
  'Present'
FROM generate_series(1, 7) i;

INSERT INTO public.attendance_sessions (employee_id, outlet_id, date, check_in, check_out, hours_worked, status)
SELECT 
  (SELECT id FROM public.employees WHERE emp_code = 'EMP003'),
  (SELECT id FROM public.outlets WHERE name = 'Adyar Branch'),
  current_date - i,
  (current_date - i) + interval '8 hours',
  (current_date - i) + interval '18 hours',
  10.0,
  'Present'
FROM generate_series(1, 7) i;

-- END OF SCRIPT
-- =====================================================================================
-- PATCH: Add missing tables not included in the master schema
-- Run this ONCE after 00_master_schema.sql if you already ran it
-- =====================================================================================

-- 1. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_read_all" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_manager_write" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 2. INCENTIVES TABLE
CREATE TABLE IF NOT EXISTS public.incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'bonus',
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  month text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentives TO authenticated;
GRANT ALL ON public.incentives TO service_role;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incentives_read_all" ON public.incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "incentives_manager_write" ON public.incentives FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 3. FIX DESIGNATIONS RLS (add WITH CHECK for insert/update)
DROP POLICY IF EXISTS "desigs_manager_write" ON public.designations;
CREATE POLICY "desigs_manager_write" ON public.designations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 4. FIX COMPANY SETTINGS RLS (add WITH CHECK)
DROP POLICY IF EXISTS "settings_manager_write" ON public.company_settings;
CREATE POLICY "settings_manager_write" ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 5. FIX DEPARTMENTS RLS (add WITH CHECK)
DROP POLICY IF EXISTS "depts_manager_write" ON public.departments;
CREATE POLICY "depts_manager_write" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- 6. ADD EXTRA COLUMNS TO COMPANY_SETTINGS IF MISSING
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS half_day_threshold numeric NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS full_day_hours numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS grace_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS leave_days text[] NOT NULL DEFAULT ARRAY['Sunday'],
  ADD COLUMN IF NOT EXISTS ot_automated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS perfect_attendance_reward numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS automated_incentives_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lunch_break_minutes integer NOT NULL DEFAULT 60;

-- END OF PATCH
-- =====================================================================
-- PATCH: Add department column to designations table
-- Run this ONCE in Supabase SQL Editor
-- =====================================================================

ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';

-- Update the existing seeded designations with their departments
UPDATE public.designations SET department = 'Cleaning'   WHERE name IN ('Cleaner', 'Washer', 'Presser / Ironer', 'Spotter', 'Packer');
UPDATE public.designations SET department = 'Management' WHERE name IN ('Supervisor', 'Store Manager');

-- END OF PATCH

-- PATCH: Make outlet_id nullable in attendance_sessions
-- Run this ONCE in your Supabase SQL editor if manual check-in fails with:
--   "null value in column outlet_id violates not-null constraint"
--
-- The outlet_id column was originally NOT NULL, but manager-initiated
-- manual check-ins may not always have a known outlet.
-- This patch makes it optional while keeping the foreign key intact.

ALTER TABLE public.attendance_sessions
  ALTER COLUMN outlet_id DROP NOT NULL;

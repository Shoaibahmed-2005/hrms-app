-- Phase 6 migration for existing Supabase projects.
-- Run this once if your database was created before designation deductions existed.

create table if not exists public.designation_deductions (
  id uuid primary key default gen_random_uuid(),
  designation text unique not null,
  absent_day_deduction numeric not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.designation_deductions to authenticated;
grant all on public.designation_deductions to service_role;
alter table public.designation_deductions enable row level security;

drop policy if exists "designation_deductions_select_all_auth" on public.designation_deductions;
create policy "designation_deductions_select_all_auth"
on public.designation_deductions
for select to authenticated
using (true);

drop policy if exists "designation_deductions_manager_write" on public.designation_deductions;
create policy "designation_deductions_manager_write"
on public.designation_deductions
for all to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

alter table public.employees alter column email drop not null;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;

drop policy if exists "departments_select_all_auth" on public.departments;
create policy "departments_select_all_auth"
on public.departments
for select to authenticated
using (true);

drop policy if exists "departments_manager_write" on public.departments;
create policy "departments_manager_write"
on public.departments
for all to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

insert into public.departments (name)
select distinct trim(department)
from public.employees
where nullif(trim(department), '') is not null
on conflict (name) do nothing;

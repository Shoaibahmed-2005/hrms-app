-- Hivetree HRMS — initial schema (run in your own Supabase SQL editor)
-- See README.md for setup.

create type public.app_role as enum ('manager', 'employee');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_self_select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_self_select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'employee'))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  emp_code text unique not null,
  full_name text not null,
  email text unique,
  role text not null,
  department text not null,
  phone text,
  pay_type text not null default 'monthly' check (pay_type in ('monthly', 'hourly')),
  salary numeric not null default 0,
  monthly_salary numeric not null default 0,
  hourly_rate numeric not null default 0,
  fixed_bonus numeric not null default 0,
  manager text,
  initial_login text,
  status text not null default 'Active',
  join_date date not null default current_date,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employees to authenticated;
grant select on public.employees to anon;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "employees_select_all_auth" on public.employees for select to authenticated using (true);
create policy "employees_public_scanner_select" on public.employees for select to anon using (true);
create policy "employees_manager_write" on public.employees for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "departments_select_all_auth" on public.departments for select to authenticated using (true);
create policy "departments_manager_write" on public.departments for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.face_descriptors (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  descriptor double precision[] not null,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.face_descriptors to authenticated;
grant select on public.face_descriptors to anon;
grant all on public.face_descriptors to service_role;
alter table public.face_descriptors enable row level security;
create policy "face_public_select" on public.face_descriptors for select to anon using (true);
create policy "face_manager_all" on public.face_descriptors for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  face_verified boolean not null default false,
  face_confidence numeric,
  status text not null default 'Present',
  hours_worked numeric not null default 0,
  unique (employee_id, date)
);
grant select, insert, update on public.attendance to authenticated;
grant select, insert, update on public.attendance to anon;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "attendance_scanner_insert" on public.attendance for insert to anon with check (employee_id is not null);
create policy "attendance_scanner_select" on public.attendance for select to anon using (employee_id is not null);
create policy "attendance_scanner_update" on public.attendance for update to anon using (employee_id is not null) with check (employee_id is not null);
create policy "attendance_manager_select" on public.attendance for select to authenticated using (public.has_role(auth.uid(), 'manager'));
create policy "attendance_manager_all" on public.attendance for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.face_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'Pending',
  manager_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.face_reset_requests to authenticated;
grant all on public.face_reset_requests to service_role;
alter table public.face_reset_requests enable row level security;
create policy "face_reset_self_insert_select" on public.face_reset_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "face_reset_self_select" on public.face_reset_requests for select to authenticated using (auth.uid() = user_id);
create policy "face_reset_self_complete" on public.face_reset_requests for update to authenticated
  using (auth.uid() = user_id and status = 'Approved')
  with check (auth.uid() = user_id and status = 'Completed');
create policy "face_reset_manager_all" on public.face_reset_requests for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.company_settings (
  id boolean primary key default true,
  face_threshold numeric not null default 80,
  shift_start time not null default '09:30',
  shift_end time not null default '18:30',
  overtime_multiplier numeric not null default 1.5,
  attendance_cooldown_minutes integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id)
);
insert into public.company_settings (id) values (true) on conflict (id) do nothing;
grant select, insert, update on public.company_settings to authenticated;
grant all on public.company_settings to service_role;
alter table public.company_settings enable row level security;
create policy "company_settings_select_all_auth" on public.company_settings for select to authenticated using (true);
create policy "company_settings_manager_write" on public.company_settings for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.designations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  absent_day_deduction numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.designations to authenticated;
grant all on public.designations to service_role;
alter table public.designations enable row level security;
create policy "designations_select_all_auth" on public.designations for select to authenticated using (true);
create policy "designations_manager_write" on public.designations for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

create table public.designation_deductions (
  id uuid primary key default gen_random_uuid(),
  designation text unique not null,
  absent_day_deduction numeric not null default 0,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.designation_deductions to authenticated;
grant all on public.designation_deductions to service_role;
alter table public.designation_deductions enable row level security;
create policy "designation_deductions_select_all_auth" on public.designation_deductions for select to authenticated using (true);
create policy "designation_deductions_manager_write" on public.designation_deductions for all to authenticated
  using (public.has_role(auth.uid(), 'manager'))
  with check (public.has_role(auth.uid(), 'manager'));

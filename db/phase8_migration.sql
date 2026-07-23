-- Phase 8 migration for scanner cooldown, master data, and safer face matching.
-- Run this once after Phase 6 on existing Supabase projects.

alter table public.company_settings
add column if not exists attendance_cooldown_minutes integer not null default 1;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_settings'
      and column_name = 'attendance_cooldown_seconds'
  ) then
    execute '
      update public.company_settings
      set attendance_cooldown_minutes = greatest(
        1,
        ceiling(coalesce(attendance_cooldown_seconds, 60)::numeric / 60)::integer
      )
      where attendance_cooldown_seconds is not null
    ';
  end if;
end $$;

grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update on public.company_settings to authenticated;
grant select, insert, update, delete on public.designation_deductions to authenticated;

create table if not exists public.designations (
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

drop policy if exists "designations_select_all_auth" on public.designations;
create policy "designations_select_all_auth"
on public.designations
for select to authenticated
using (true);

drop policy if exists "designations_manager_write" on public.designations;
create policy "designations_manager_write"
on public.designations
for all to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

insert into public.designations (name, absent_day_deduction)
select designation, absent_day_deduction
from public.designation_deductions
on conflict (name) do update set
  absent_day_deduction = excluded.absent_day_deduction,
  updated_at = now();

insert into public.designations (name)
select distinct trim(role)
from public.employees
where nullif(trim(role), '') is not null
on conflict (name) do nothing;

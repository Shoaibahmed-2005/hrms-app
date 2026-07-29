# Hivetree HRMS

Manager-only HRMS with face-recognition attendance, employee management, payroll reports, company reports, configurable master data, and local workforce insights.

Built with TanStack Start, React 19, Vite, Tailwind v4, shadcn/ui, Recharts, face-api.js, jsPDF, AutoTable, and Supabase.

## Current Features

- **Manager/Admin app** for dashboard, employees, face management, attendance history, payroll, reports, settings, and AI workforce insights.
- **No employee login flow.** Employees do not use the system and cannot access dashboards, reports, salary, or payroll pages.
- **Public attendance scanner** at `/attendance`, with no manager navigation or admin UI.
- **Face-only attendance.** The scanner identifies a registered employee face and records check-in/check-out.
- **Profile Pictures.** During face registration, a photo is captured and displayed across the dashboard, employee list, attendance, and payroll screens.
- **Scan cooldown.** After a successful check-in or check-out, the same employee cannot be toggled again until the configured cooldown expires. Default: `1` minute.
- **Safer face matching.** The scanner rejects no-face frames, multiple-face frames, weak matches, and ambiguous matches.
- **Face Management.** Managers register or update employee face profiles and view registration status.
- **Full employee management.** Managers can add, edit, update, and delete employee records.
- **Master data settings.** Managers can create, edit, and delete departments and designations.
- **Hourly Salary Deduction.** Pay type, salary/rate, overtime, fixed bonus, and absence deductions are strictly calculated from exact cumulative check-in/check-out hours. A full day is standardized at 10 hours.
- **Advanced Attendance & Holidays.** Features automated late check-in tracking (inherits previous session status for the day) and Public Holidays logic (via Announcements tagged `[HOLIDAY]`) that credit full pay for holidays.
- **Automated & Manual Incentives.** Managers can set an attendance threshold to auto-award perfect attendance, and manually add custom incentives.
- **PDF reports.** Payroll and company reports use jsPDF + AutoTable with a corporate Hivetree layout.
- **Local AI insights.** The AI module uses free in-browser trend analysis over Supabase attendance/payroll data. No paid AI API is required.

## Quick Start

```bash
npm install
copy .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm.cmd run dev
```

Open the local URL printed by Vite. The app commonly uses `http://localhost:8080`.

## Environment

Only these frontend env vars are required:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Restart the dev server after changing `.env`.

## Supabase Setup

### Fresh Supabase Project

Use this path only when the database has no existing HRMS tables/data.

1. Create a Supabase project.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
3. Run `db/schema.sql` once in Supabase SQL Editor.
4. In Supabase **Authentication > Providers**, keep Email enabled.
5. In Supabase Auth settings, configure Site URL and Redirect URLs for local and production domains.
6. Start the app and create the first manager at `/signup`.

### Existing Supabase Project

Do **not** rerun `db/schema.sql` on a database that already has users, employees, attendance, or face data.

Run migrations only:

```sql
-- If Phase 6 was not already applied:
-- run db/phase6_migration.sql first

-- Then run:
-- db/phase8_migration.sql
```

`phase8_migration.sql` is data-safe. It uses `if not exists`, adds missing columns, creates the `designations` table, copies existing designation deduction data, copies existing employee roles into designations, and grants manager write permissions. It does not delete existing users, employees, attendance, or face descriptors.

## Database Files

- `db/schema.sql` - full latest schema for a brand-new Supabase database.
- `db/phase6_migration.sql` - update path for older databases before payroll/deduction changes.
- `db/phase8_migration.sql` - update path for minute-based cooldown, designations master data, permissions, and safer Phase 8 behavior.

## First Manager

Use `/signup` to create the first manager account. The signup flow sends manager role metadata to Supabase Auth. The `handle_new_user` trigger writes `profiles` and `user_roles`.

If an existing Supabase user cannot access manager pages, confirm they have a row in `public.user_roles` with role `manager`.

## Routes

- `/` - manager sign in
- `/signup` - create manager account
- `/dashboard` - manager dashboard
- `/employees` - add, edit, update, and delete employee records
- `/face-management` - register or update employee face profiles
- `/attendance` - public face scanner
- `/attendance-history` - attendance records and face match percentages
- `/payroll` - individual employee salary report generation
- `/reports` - company period report
- `/settings` - company settings, cooldown, departments, designations, deduction rules
- `/ai-prediction` - local workforce insights and recommendations

## Production Workflow

1. Run the correct Supabase migration path.
2. Create/sign in as a manager.
3. Go to `/settings`.
4. Create departments.
5. Create designations and set absence deduction amounts.
6. Set shift timings, overtime multiplier, face threshold, and attendance cooldown in minutes.
7. Go to `/employees` and create employee records.
8. Go to `/face-management` and register each employee face.
9. Use `/attendance` on a camera-enabled device to record check-ins/check-outs.

## Face Attendance Notes

- Camera access requires HTTPS in production. Localhost is exempt.
- The scanner is intentionally CPU-backed for stability with face-api.js/TensorFlow in browsers.
- Face model weights are served locally from `public/models/face-api`; the scanner does not depend on the jsDelivr model CDN.
- Mobile scanning uses lower camera resolution, smaller detector input, and the tiny landmark model to reduce CPU/RAM pressure.
- Only one face should be visible during registration or attendance scanning.
- If multiple faces are detected, the scan is rejected.
- If no face is detected, the scanner waits and tries again.
- If the best match is too weak or too close to another employee match, the scan is rejected.
- After check-in/check-out, the same employee is ignored during the cooldown period.

## Known Dev Warning

During `npm run dev`, Vite may print:

```text
Sourcemap for ".../node_modules/face-api.js/..." points to missing source files
```

This is harmless. The npm package ships sourcemaps that reference source files not included in the package. It does not affect face detection, attendance, builds, or production behavior.

## Reports

- Payroll report: manager selects one employee and date range, then downloads that employee's salary PDF.
- Company report: manager selects a period and downloads company-level payroll, attendance, spending, and employee evaluation data.
- PDFs are generated with `jsPDF` and `jspdf-autotable`.

## Project Structure

```text
src/
  components/
  lib/
    auth-context.tsx
    supabase.ts
    hrms-db.ts
    face.ts
    pdf.ts
    csv.ts
  routes/
    attendance.tsx
    _app.ai-prediction.tsx
    _app.attendance-history.tsx
    _app.dashboard.tsx
    _app.employees.tsx
    _app.employees.$id.tsx
    _app.face-management.tsx
    _app.payroll.tsx
    _app.reports.tsx
    _app.settings.tsx
db/
  schema.sql
  phase6_migration.sql
  phase8_migration.sql
```

## Scripts

- `npm.cmd run dev`
- `npm.cmd run build`
- `npm.cmd run preview`
- `npm.cmd run lint`

On Windows PowerShell, prefer `npm.cmd` if `.ps1` script execution is blocked.

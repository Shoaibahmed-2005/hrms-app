# Cleans HRMS

[![Deploy with Vercel](https://vercel.com/button)](https://hrms-app-amber.vercel.app/)

A complete, end-to-end Human Resources Management System designed specifically for the **Cleans** dry cleaning business. This system provides a Manager Dashboard, Employee Management, Kiosk Face-Recognition Attendance, automated Payroll calculations, and AI Workforce Insights.

---

## 🌟 Key Features

- **Automated Face Attendance**: A public kiosk mode (`/attendance`) allows staff to check in and out simply by looking at the camera.
- **Smart Payroll & Deductions**: Automatically calculates standard monthly salary, overtime pay, custom per-hour role deductions for absences, and fixed bonuses.
- **Department & Designation Logic**: Roles are tied directly to departments (e.g., "Washer" in "Cleaning Staff") for clean, structured employee onboarding.
- **Grace Periods & Late Tracking**: Customizable shift timings and grace periods auto-flag late check-ins and half-days.
- **Profile Image Extraction**: Captures profile pictures automatically during the math-based face registration process.
- **End-to-End Security**: Protected by Supabase Row Level Security (RLS) ensuring only authenticated Managers can access or modify HR data.

---

## 🚀 End-to-End Setup Guide

This guide is for developers setting up the project from scratch.

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in the left sidebar.
3. Open `db/setup_master.sql` from this repository, copy its entire contents, and run it in the SQL Editor.
   *(This safely creates all tables, policies, and dummy data needed).*
4. **Required Patch** — Open `db/04_make_outlet_nullable.sql`, copy its contents, and run it in the SQL Editor as well.
   *(This patch makes the `outlet_id` column optional so that manager-initiated manual check-ins work correctly.)*

### 2. Connect Your App
Create a `.env` file in the root folder with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Local Development
To run the app locally:
```bash
npm install
npm run dev
```
The app will start at `http://localhost:8080`.

### 4. Create Your Manager Account
1. Go to **Authentication -> Users** in your Supabase dashboard and click **Add User -> Create New User**.
2. Enter your manager email and password.
3. Go to the **Table Editor -> `user_roles`** table.
4. Insert a new row linking your newly created user ID with the role `manager`.

### 5. Web Hosting (Vercel)
1. Import this GitHub repository into Vercel.
2. In the Vercel **Environment Variables** settings, add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Click **Deploy**.
4. **Crucial Final Step**: Copy your live Vercel URL, go to your Supabase Dashboard -> **Authentication -> URL Configuration**, and add your Vercel link as the **Site URL**.

### 6. Register the Kiosk Tablet
The face-scan attendance kiosk (`/kiosk`) must be linked to an outlet before employees can check in using it.
1. Open the **Outlets** page in the Manager Dashboard and note the **Device Secret** of the outlet you want to link the tablet to.
2. Open the Kiosk page on the tablet (`/kiosk`).
3. **Tap the Cleans logo in the top-left corner 5 times quickly**.
4. A prompt will appear — enter the outlet's Device Secret UUID and press OK.
5. The tablet is now registered. Employees can scan their faces to check in and out.

> **Note**: If employees check in via the manager's manual Check-In button (on the Attendance page), no tablet registration is needed. That is intended as a backup for when face scanning fails.

---


## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS Policies)
- **Face Recognition**: face-api.js (runs entirely in the browser, no paid API required)
- **Reporting**: jsPDF & AutoTable (generates instant salary and company PDFs)

---

*Built with ❤️ for Cleans Dry Cleaning.*

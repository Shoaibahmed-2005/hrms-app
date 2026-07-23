# HRMS — Human Resource Management System

A full-stack web app for managing employees, attendance, leave, payroll, and company announcements. Built with **React** on the frontend and **Node.js** on the backend, with a **local PostgreSQL** database and **AI-powered biometric face recognition** running directly in the browser.

---

> **⚠️ No Python, no venv, no requirements.txt.**
> This project is 100% JavaScript/TypeScript (Node.js). Dependencies are managed by `npm` via `package.json` files — one in `frontend/` and one in `backend/`.

---

## What Does This App Do?

| Feature | Description |
|---|---|
| 🔐 **Auth** | Login with email + password. JWT sessions stored securely in `sessionStorage` (supports multiple tabs). |
| 🛡️ **Face Biometrics** | Uses `face-api.js` (ResNet-34 & TinyFaceDetector) for 128-point facial recognition. Manager registers face during employee creation, and employees use it for live check-ins. |
| 👥 **Employees** | Manager can add, view, activate/deactivate employees, and set custom shift times and geofence radii per company. |
| 🕐 **Attendance** | Two-mode system: (1) **Employee Kiosk** at `/kiosk` — face-recognition terminal for employees to self-check-in/out. (2) **Manager Dashboard** — manual check-in/out for any employee without face verification. |
| 🏖️ **Leave** | Employees apply for leave. Manager approves/rejects. |
| 💰 **Payroll** | Manager generates and finalizes payslips based on hourly or monthly wages. **Managers can also instantly add on-the-spot bonuses** directly from Kiosk check-out notifications. |
| 📢 **Announcements** | Company-wide posts broadcasted by managers. **Today's announcements appear live on the Employee Kiosk** home screen automatically. |
| 💬 **Chat** | Direct internal messaging between employees and managers. |
| 🔔 **Notifications** | Real-time system alerts (check-ins, late arrivals, leave status, payroll) with direct clickable links to profiles. |
| 📊 **Reports & AI** | AI workforce trend prediction, plus charts showing department salary costs. |
| ⚙️ **Settings** | Configure geofence radius, biometric strictness, and shift times. |

---

## Project Structure

```
hrms-code/
│
├── frontend/                  ← React web app (runs on http://localhost:5173)
│   ├── public/
│   │   └── models/            ← Pre-trained AI models for face-api.js
│   ├── src/
│   │   ├── components/        ← Reusable UI components (including FaceCamera.tsx)
│   │   ├── hooks/             ← Custom React hooks (useFaceApi.ts)
│   │   ├── lib/
│   │   │   ├── api.ts         ← apiFetch() — intercepts and proxies backend calls
│   │   │   └── auth.tsx       ← Login state management (JWT in sessionStorage)
│   │   ├── routes/            ← Pages (file-based routing via TanStack Router)
│   │   │   └── _authenticated/← Manager & Employee distinct views
│   ├── .env                   ← Frontend env: VITE_API_BASE_URL=/api (Proxies to backend)
│   ├── vite.config.ts         ← Vite bundler config (Configured for API proxying)
│   └── package.json           ← Frontend npm dependencies
│
├── backend/                   ← Node.js REST API (runs on http://localhost:3000)
│   ├── database/
│   │   ├── prisma/            ← Prisma folder
│   │   │   └── schema.prisma  ← Database schema (PostgreSQL)
│   │   ├── seed.ts            ← Populates DB with demo data
│   │   └── db.ts              ← Prisma Client connection instance
│   ├── src/
│   │   ├── middleware/        ← JWT verification + role guards
│   │   ├── routes/            ← Core API logic (auth, attendance, payroll, leaves, etc.)
│   │   └── index.ts           ← Express app entry point & Request Logger
│   ├── .env                   ← DATABASE_URL, JWT_SECRET, PORT
│   └── package.json           ← Backend npm dependencies
│
└── package.json               ← Monorepo root
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend UI** | React 19 + Vite | Fast modern UI framework + bundler |
| **Face Recognition** | `face-api.js` | Runs neural networks natively in the browser for privacy |
| **Routing** | TanStack Router | File-based, fully type-safe routing |
| **Data Fetching** | TanStack Query | Caches API calls and handles real-time polling |
| **UI Components** | shadcn/ui + Tailwind | Pre-built accessible components with styling |
| **Backend** | Node.js + Express 5 | REST API server with real-time console logging |
| **ORM** | Prisma | Type-safe database queries |
| **Database** | PostgreSQL (local) | High-performance relational database |

---

## Prerequisites

Install these before starting:

- **Node.js v18+** → [nodejs.org/en/download](https://nodejs.org/en/download)
- **npm v9+** (comes bundled with Node.js)
- **PostgreSQL** → [postgresql.org/download](https://www.postgresql.org/download/) (must be running locally)

Verify your installs:
```bash
node --version    # v18.x.x or higher
npm --version     # 9.x.x or higher
```

> ❌ **No Python needed. No venv. No pip. No requirements.txt.**

---

## First-Time Setup

Do this **once** when setting up the project.

### 1. Set up the Backend

Open a terminal and navigate into the backend folder:
```bash
cd hrms-code/backend
npm install
```

Open `backend/.env` and confirm it looks like this:
```
DATABASE_URL="postgresql://postgres:ShoaibAhmed@localhost:5432/hrms"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
```
> Change the username/password to match your PostgreSQL credentials if different.

Create all database tables and seed demo data:
```bash
npx prisma migrate dev
npm run seed
```

### 2. Set up the Frontend

Open a new terminal and go to the frontend folder:
```bash
cd hrms-code/frontend
npm install
```

The `frontend/.env` file should contain:
```
VITE_API_BASE_URL=/api
```
*(This tells Vite to proxy all requests cleanly to the backend without CORS issues).*

---

## Running the App

You need **two terminal windows open at the same time**.

### Terminal 1 — Start the Backend
```bash
cd hrms-code/backend
npm run dev
```
Wait until you see: `Backend running on port 3000`. Every API request is logged here in real-time.

### Terminal 2 — Start the Frontend
```bash
cd hrms-code/frontend
npm run dev
```
Vite will print multiple links like this:
```
➜  Local:   https://localhost:5173/
➜  Network: https://192.168.1.x:5173/
```

| Link | Purpose |
|---|---|
| `https://localhost:5173/` | Open on **your machine** (manager dashboard) |
| `https://192.168.1.x:5173/` | Open on **any device on the same Wi-Fi** (e.g. tablet for kiosk) |

### Pages

| Page | URL | Who uses it |
|---|---|---|
| **Manager Dashboard** | `https://localhost:5173/` | Manager — login required |
| **Employee Kiosk** | `https://localhost:5173/kiosk` | Employees — no login, always open on office tablet |

---

## Two-Device Setup (Recommended)

This is the intended real-world workflow:

1. **Manager's device** → open `https://localhost:5173/` → log in → leave the dashboard open to monitor staff and receive live Kiosk notifications.
2. **Office tablet** → open `https://192.168.1.x:5173/kiosk` → leave it open all day as the face-recognition attendance terminal.

Employees walk up to the tablet, press **Check In** or **Check Out**, look at the camera, and they're done. 
Any **Announcements** posted by the manager today will automatically appear on this tablet screen for employees to read.
When an employee checks out, a notification pops up on the manager's device, giving them a 1-click option to add a **Bonus** to that shift.

## Multi-Tab Support & Login

This application uses `sessionStorage` for security tokens. This means **every browser tab is completely independent**.
You can open `https://localhost:5173` in Tab A and log in as the Manager, then open a completely new Tab B and log in as a different account to test real-time interactions!

| Role | Email | Password |
|---|---|---|
| **Manager** | `manager@demohrms.com` | `Manager@123` |
| **Employee** | `employee2@demohrms.com` | `Employee@123` |

---

## Frequently Asked Questions

**Q: Do I need a virtual environment (venv)?**
No. This project uses **Node.js**, where isolation is handled automatically via the `node_modules/` folder.

**Q: Is there a `requirements.txt`?**
No. The Node.js equivalent is `package.json`. Run `npm install` instead.

**Q: Where does Face Recognition happen?**
The facial geometry (128-point float vector) is extracted inside your web browser using `face-api.js`. Only the vector (not the photo) is sent to the backend, which compares it against the Postgres database using Euclidean Distance mathematics.

**Q: Why does the Manager's Attendance table look empty?**
By default, the Manager's attendance view filters to show **today's** records. If it's the weekend or no one has checked in today, it will be empty. Use the date picker to go back in time, or log in as an employee in another tab and check in!

**Q: What if the backend says "Cannot connect to database"?**
Make sure PostgreSQL is actively running on your machine via pgAdmin or Windows Services.


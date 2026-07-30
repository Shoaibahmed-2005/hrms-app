# Cleans HRMS - Deployment Guide

This project is built with React (Vite), TailwindCSS, and Supabase.

## 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the file `db/setup_master.sql` from this repository.
4. Copy its entire contents and run it in the SQL Editor. 
   *(This will create all tables, policies, RLS, and dummy data needed for the app).*

## 2. Environment Variables

Create a `.env` file in the root of the project with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Vercel Deployment

This project is pre-configured for Vercel via `vercel.json`.

1. Import this GitHub repository into Vercel.
2. In the Vercel project settings, go to **Environment Variables**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Click **Deploy**.

## 4. CORS Configuration (Important)

Once deployed on Vercel, copy your live Vercel URL (e.g. `https://cleans-hrms.vercel.app`).
Go to your **Supabase Dashboard → Settings → API → Allowed Origins** and add your Vercel URL. This allows your hosted frontend to communicate with your Supabase backend.

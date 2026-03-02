-- Fix schema: ensure required columns exist
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste & Run

-- 1) meal_logs.logged_at — required for "Save to Log" and dashboard
ALTER TABLE public.meal_logs
ADD COLUMN IF NOT EXISTS logged_at date NOT NULL DEFAULT current_date;

-- 2) profiles.full_name — optional, for greeting on dashboard
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text;

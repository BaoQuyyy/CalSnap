-- Run this SQL in Supabase SQL Editor

-- 1. Create daily_habits table for Steps, Water, Exercise
CREATE TABLE IF NOT EXISTS daily_habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  date date DEFAULT current_date NOT NULL,
  steps int DEFAULT 0,
  water_ml int DEFAULT 0,
  exercise_minutes int DEFAULT 0,
  exercise_calories int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habits" ON daily_habits FOR ALL USING (auth.uid() = user_id);

-- 2. Fix logged_at column if missing
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS logged_at date DEFAULT current_date;
UPDATE meal_logs SET logged_at = created_at::date WHERE logged_at IS NULL;

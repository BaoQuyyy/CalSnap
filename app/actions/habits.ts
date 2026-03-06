'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { updateDailyAdherence, updateJourneyProgress } from './adherence'

export type ExerciseType = 'Walking' | 'Running' | 'Gym' | 'Cycling'

const CAL_PER_MIN: Record<ExerciseType, number> = {
  Walking: 4,
  Running: 10,
  Gym: 7,
  Cycling: 8,
}

// ✅ Helper: luôn dùng local date (tránh UTC shift)
function localDate(date?: Date) {
  return (date ?? new Date()).toLocaleDateString('en-CA') // YYYY-MM-DD theo local timezone
}

export async function getDailyHabits(date: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data, error } = await supabase
    .from('daily_habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (error) return null
  return data ?? null
}

export async function upsertSteps(date: string, steps: number) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('daily_habits')
    .upsert(
      { user_id: user.id, date, steps },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    if (error.message?.toLowerCase().includes('daily_habits')) return { success: true }
    return { error: error.message }
  }
  revalidatePath('/')
  return { success: true }
}

export async function upsertWater(date: string, waterMl: number) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('daily_habits')
    .upsert(
      { user_id: user.id, date, water_ml: waterMl },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    if (error.message?.toLowerCase().includes('daily_habits')) return { success: true }
    return { error: error.message }
  }

  await supabase
    .from('profiles')
    .update({ water_ml_today: waterMl, water_updated_date: date })
    .eq('id', user.id)

  // Fire-and-forget heavy operations — don't block the response
  void updateDailyAdherence(date)
  void updateJourneyProgress()

  revalidatePath('/')
  return { success: true }
}

export async function upsertExercise(
  date: string,
  minutes: number,
  type: ExerciseType
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const calories = Math.round(minutes * CAL_PER_MIN[type])

  const { data: existing } = await supabase
    .from('daily_habits')
    .select('exercise_minutes, exercise_calories')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  const newMinutes = (existing?.exercise_minutes ?? 0) + minutes
  const newCalories = (existing?.exercise_calories ?? 0) + calories

  const { error } = await supabase
    .from('daily_habits')
    .upsert(
      { user_id: user.id, date, exercise_minutes: newMinutes, exercise_calories: newCalories },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    if (error.message?.toLowerCase().includes('daily_habits')) return { success: true }
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true, newCalories }
}

export async function getStreakAndWeeklyMeals(userId: string) {
  const supabase = await createClient()

  // ✅ Dùng local date thay vì toISOString()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const startDate = localDate(sevenDaysAgo)

  const { data: meals } = await supabase
    .from('meal_logs')
    .select('logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate)

  const datesWithMeals = new Set(
    (meals ?? []).map((m) => (m as { logged_at: string }).logged_at)
  )
  const weeklyMealsCount = (meals ?? []).length

  let streak = 0
  const checkDate = new Date()
  for (let i = 0; i < 365; i++) {
    const d = localDate(checkDate) // ✅ local date
    if (datesWithMeals.has(d)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return { streak, weeklyMealsCount }
}
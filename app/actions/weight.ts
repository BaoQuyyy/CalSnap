'use server'

import { createClient } from '@/lib/supabase/server'

export async function addWeightCheckin(weight_kg: number, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const today = new Date().toISOString().split('T')[0]

  await supabase.from('weight_checkins').upsert(
    { user_id: user.id, weight_kg, date: today, note: note ?? null },
    { onConflict: 'user_id,date' }
  )

  // Update weight trong profile
  await supabase.from('profiles').update({ weight_kg }).eq('id', user.id)

  // Tính lại fitness plan với cân nặng mới
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, age, height_cm, target_weight_kg, goal, activity_level, fitness_plan')
    .eq('id', user.id)
    .single()

  if (profile?.age && profile?.height_cm && profile?.goal && profile?.activity_level) {
    const gender = (profile.gender as string) ?? 'male'
    const age = profile.age
    const height_cm = profile.height_cm
    const target_weight_kg = profile.target_weight_kg ?? weight_kg
    const goal = profile.goal as string
    const activity_level = profile.activity_level as string

    // Mifflin-St Jeor với cân nặng mới
    const bmr = gender === 'male'
      ? Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5)
      : Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161)

    const multiplierMap: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    }
    const activityMultiplier = multiplierMap[activity_level] ?? 1.55

    const tdee = Math.round(bmr * activityMultiplier)
    const daily_calories =
      goal === 'lose_weight' ? tdee - 500 :
      goal === 'gain_muscle' ? tdee + 300 :
      tdee

    const heightM = height_cm / 100
    const bmi = Math.round((weight_kg / (heightM ** 2)) * 10) / 10
    const bmi_category =
      bmi < 18.5 ? 'Underweight' :
      bmi < 25 ? 'Normal' :
      bmi < 30 ? 'Overweight' : 'Obese'

    const weightDiff = Math.abs(weight_kg - (target_weight_kg as number))
    const estimated_weeks_to_goal = weightDiff === 0 ? 0 : Math.round(weightDiff / 0.5)

    const oldPlan = (profile.fitness_plan as any) ?? {}

    const newPlan = {
      ...oldPlan,
      bmi,
      bmi_category,
      bmr,
      tdee,
      daily_calories,
      daily_protein_g: Math.round(weight_kg * 2),
      daily_carbs_g: Math.round((daily_calories * 0.45) / 4),
      daily_fat_g: Math.round((daily_calories * 0.25) / 9),
      water_liters: Math.round(weight_kg * 0.033 * 10) / 10,
      estimated_weeks_to_goal,
    }

    await supabase.from('profiles').update({
      fitness_plan: newPlan,
      daily_calorie_goal: daily_calories,
    }).eq('id', user.id)
  }

  return { success: true }
}

export async function getWeightHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('weight_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })
    .limit(12)

  return (data as any[]) ?? []
}
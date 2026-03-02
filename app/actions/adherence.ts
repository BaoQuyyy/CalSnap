'use server'

import { createClient } from '@/lib/supabase/server'

function calcScore(goal: number, actual: number): number {
  if (goal === 0) return 100
  const ratio = actual / goal
  if (ratio >= 0.9 && ratio <= 1.1) return 100
  if (ratio >= 0.8 && ratio <= 1.2) return 80
  if (ratio >= 0.7 && ratio <= 1.3) return 60
  if (ratio >= 0.6 && ratio <= 1.4) return 40
  return 20
}

export async function updateDailyAdherence(date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('fitness_plan, water_ml_today, water_updated_date')
    .eq('id', user.id)
    .single()

  if (!profile?.fitness_plan) return null
  const plan = profile.fitness_plan as any

  const { data: meals } = await supabase
    .from('meal_logs')
    .select('calories, protein, carbs, fat')
    .eq('user_id', user.id)
    .eq('logged_at', date)

  const actual = {
    calories: meals?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0,
    protein: meals?.reduce((s, m) => s + (m.protein ?? 0), 0) ?? 0,
    carbs: meals?.reduce((s, m) => s + (m.carbs ?? 0), 0) ?? 0,
    fat: meals?.reduce((s, m) => s + (m.fat ?? 0), 0) ?? 0,
  }

  const waterActual =
    profile.water_updated_date === date ? (profile.water_ml_today ?? 0) : 0
  const waterGoal = Math.round((plan.water_liters ?? 2.5) * 1000)

  const scores = [
    calcScore(plan.daily_calories, actual.calories),
    calcScore(plan.daily_protein_g, actual.protein),
    calcScore(plan.daily_carbs_g, actual.carbs),
    calcScore(plan.daily_fat_g, actual.fat),
  ]
  const overallScore = Math.round(
    scores.reduce((a: number, b: number) => a + b, 0) / scores.length
  )
  const isOnTrack = overallScore >= 70

  await supabase.from('plan_adherence').upsert(
    {
      user_id: user.id,
      date,
      calories_goal: plan.daily_calories,
      calories_actual: actual.calories,
      protein_goal: plan.daily_protein_g,
      protein_actual: Math.round(actual.protein),
      carbs_goal: plan.daily_carbs_g,
      carbs_actual: Math.round(actual.carbs),
      fat_goal: plan.daily_fat_g,
      fat_actual: Math.round(actual.fat),
      water_goal_ml: waterGoal,
      water_actual_ml: waterActual,
      is_on_track: isOnTrack,
      adherence_score: overallScore,
    },
    { onConflict: 'user_id,date' }
  )

  return { actual, isOnTrack, overallScore }
}

export async function getAdherenceData(date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const { data } = await supabase
    .from('plan_adherence')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const history = (data ?? []) as any[]
  const today = history.find((d) => d.date === date) ?? null
  const onTrackDays = history.filter((d) => d.is_on_track).length
  const journeyScore = Math.round((onTrackDays / 7) * 100)

  return { today, history, journeyScore, onTrackDays }
}

export async function updateJourneyProgress() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  const adherence = await getAdherenceData(today)
  if (!adherence) return

  let streak = 0
  const sorted = [...adherence.history].reverse()
  for (const day of sorted) {
    if (day.is_on_track) streak++
    else break
  }

  await supabase
    .from('profiles')
    .update({
      journey_score: adherence.journeyScore,
      journey_streak: streak,
      last_adherence_date: today,
    })
    .eq('id', user.id)
}

export async function getWeeklyReport() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const { data } = await supabase
    .from('plan_adherence')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const history = (data ?? []) as any[]
  if (history.length === 0) return null

  const onTrackDays = history.filter((d) => d.is_on_track).length
  const avgScore = Math.round(
    history.reduce((s, d) => s + d.adherence_score, 0) / history.length
  )
  const avgCalories = Math.round(
    history.reduce((s, d) => s + d.calories_actual, 0) / history.length
  )
  const avgProtein = Math.round(
    history.reduce((s, d) => s + d.protein_actual, 0) / history.length
  )
  const caloriesGoal = history[0]?.calories_goal ?? 2000
  const proteinGoal = history[0]?.protein_goal ?? 150

  const weakPoints: string[] = []
  const avgProteinPct =
    proteinGoal > 0 ? Math.round((avgProtein / proteinGoal) * 100) : 100
  if (avgProteinPct < 80)
    weakPoints.push(`Protein (chỉ đạt ${avgProteinPct}% TB)`)
  const avgCalPct = Math.round((avgCalories / caloriesGoal) * 100)
  if (avgCalPct > 115)
    weakPoints.push(`Calories dư (${avgCalPct}% TB)`)
  if (avgCalPct < 85)
    weakPoints.push(`Calories thiếu (${avgCalPct}% TB)`)

  return {
    onTrackDays,
    avgScore,
    avgCalories,
    avgProtein,
    caloriesGoal,
    proteinGoal,
    weakPoints,
    history,
  }
}


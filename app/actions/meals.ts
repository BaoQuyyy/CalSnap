// app/actions/meals.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { updateDailyAdherence, updateJourneyProgress } from './adherence'

export async function saveMeal(data: {
    foodName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    imageUrl?: string
    loggedAt?: string
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const loggedAt = data.loggedAt ?? new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        image_url: data.imageUrl ?? null,
        logged_at: loggedAt,
    } as never)

    if (error) return { error: error.message }

    await updateDailyAdherence(loggedAt)
    await updateJourneyProgress()

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true }
}

export async function deleteMeal(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true }
}

// Nếu date = 'recent' → trả 10 meal gần nhất (cho QuickRelog)
// Nếu date = YYYY-MM-DD → trả meal của ngày đó
export async function getMealsForDate(date: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return []

    if (date === 'recent') {
        const { data } = await supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        return (data as any[]) ?? []
    }

    const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('logged_at', date)
        .order('created_at', { ascending: false })

    return (data as any[]) ?? []
}

// Log lại 1 meal cũ với ngày hôm nay
export async function relogMeal(meal: {
    food_name: string
    calories: number
    protein: number
    carbs: number
    fat: number
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        image_url: null,
        logged_at: today,
    } as never)

    if (error) return { error: error.message }

    await updateDailyAdherence(today)
    await updateJourneyProgress()

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true }
}

// Toggle is_favorite cho 1 meal
export async function toggleFavorite(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    // Lấy giá trị hiện tại
    const { data: meal } = await supabase
        .from('meal_logs')
        .select('is_favorite')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    const { error } = await supabase
        .from('meal_logs')
        .update({ is_favorite: !(meal?.is_favorite ?? false) } as never)
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/log')
    return { success: true }
}

export async function getWeeklyCalories() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return []

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 6)

    const { data } = await supabase
        .from('meal_logs')
        .select('logged_at, calories')
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString().split('T')[0])
        .lte('logged_at', endDate.toISOString().split('T')[0])

    if (!data) return []

    const grouped: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[d.toISOString().split('T')[0]] = 0
    }

    ;(data as any[]).forEach((row) => {
        if (row.logged_at in grouped) grouped[row.logged_at] += row.calories
    })

    return Object.entries(grouped).map(([date, calories]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        calories,
    }))
}

export async function updateCalorieGoal(goal: number) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, daily_calorie_goal: goal } as never)

    if (error) return { error: error.message }

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
}

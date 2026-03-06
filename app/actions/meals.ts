'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { updateDailyAdherence, updateJourneyProgress } from './adherence'
import type { Database } from '@/lib/types'

type MealLogInsert = Database['public']['Tables']['meal_logs']['Insert']
type MealLogUpdate = Database['public']['Tables']['meal_logs']['Update']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// ✅ Helper: local date tránh UTC shift
function localDate(date?: Date) {
    return (date ?? new Date()).toLocaleDateString('en-CA') // YYYY-MM-DD
}

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

    const loggedAt = data.loggedAt ?? localDate() // ✅

    const { data: record, error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        image_url: data.imageUrl ?? null,
        logged_at: loggedAt,
    } satisfies MealLogInsert).select().maybeSingle()

    if (error) return { error: error.message }

    await updateDailyAdherence(loggedAt)
    await updateJourneyProgress()

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true, data: record }
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

export async function getMealsForDate(date: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return []

    if (date === 'recent') {
        const { data } = await supabase
            .from('meal_logs')
            .select('id, food_name, calories, protein, carbs, fat, logged_at, created_at, is_favorite, image_url')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        return data ?? []
    }

    const { data } = await supabase
        .from('meal_logs')
        .select('id, food_name, calories, protein, carbs, fat, logged_at, created_at, is_favorite, image_url')
        .eq('user_id', user.id)
        .eq('logged_at', date)
        .order('created_at', { ascending: false })

    return data ?? []
}

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

    const today = localDate() // ✅

    const { data: record, error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        image_url: null,
        logged_at: today,
    } satisfies MealLogInsert).select().maybeSingle()

    if (error) return { error: error.message }

    await updateDailyAdherence(today)
    await updateJourneyProgress()

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true, data: record }
}

export async function toggleFavorite(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const { data: meal } = await supabase
        .from('meal_logs')
        .select('is_favorite')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()

    const { error } = await supabase
        .from('meal_logs')
        .update({ is_favorite: !(meal?.is_favorite ?? false) } satisfies MealLogUpdate)
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
        .gte('logged_at', localDate(startDate)) // ✅
        .lte('logged_at', localDate(endDate))   // ✅

    if (!data) return []

    const grouped: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[localDate(d)] = 0 // ✅
    }

    ; (data).forEach((row) => {
        if (row.logged_at in grouped) grouped[row.logged_at] += row.calories
    })

    return Object.entries(grouped).map(([date, calories]) => ({
        date,
        calories,
        label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    }))
}

export async function updateCalorieGoal(goal: number) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, daily_calorie_goal: goal } satisfies ProfileUpdate)

    if (error) return { error: error.message }

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
}

export async function updateMealNutrition(
    mealId: string,
    data: {
        calories: number
        protein: number
        carbs: number
        fat: number
        food_name?: string
    }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Not authenticated' }

        const { data: existingMeal, error: fetchError } = await supabase
            .from('meal_logs')
            .select('id, logged_at, user_id')
            .eq('id', mealId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (fetchError) return { error: fetchError.message }
        if (!existingMeal) return { error: 'Meal not found or permission denied' }

        const date = existingMeal.logged_at
        const calories = Math.round(Number(data.calories))
        const protein = Math.round(Number(data.protein))
        const carbs = Math.round(Number(data.carbs))
        const fat = Math.round(Number(data.fat))

        const updatePayload: Record<string, number | string> = { calories, protein, carbs, fat }
        if (data.food_name) updatePayload.food_name = data.food_name

        const { error: updateError } = await supabase
            .from('meal_logs')
            .update(updatePayload)
            .eq('id', mealId)
            .eq('user_id', user.id)

        if (updateError) return { error: updateError.message }

        const { data: dayMeals } = await supabase
            .from('meal_logs')
            .select('calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .eq('logged_at', date)

        const newTotals = (dayMeals ?? []).reduce(
            (acc, m) => ({
                calories: acc.calories + (Number(m.calories) || 0),
                protein: acc.protein + (Number(m.protein) || 0),
                carbs: acc.carbs + (Number(m.carbs) || 0),
                fat: acc.fat + (Number(m.fat) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )

        await updateDailyAdherence(date)
        await updateJourneyProgress()

        revalidatePath('/log')
        revalidatePath('/')

        return {
            success: true as const,
            data: { id: mealId, calories, protein, carbs, fat },
            newTotals: {
                calories: Math.round(newTotals.calories),
                protein: Math.round(newTotals.protein),
                carbs: Math.round(newTotals.carbs),
                fat: Math.round(newTotals.fat),
            },
        }
    } catch (err: unknown) {
        console.error('updateMealNutrition crash:', err)
        return { error: String((err as Error)?.message ?? 'Server error') }
    }
}
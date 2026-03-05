import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateDailyAdherence, updateJourneyProgress } from '@/app/actions/adherence'

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[ACTION] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (type === 'LOG_MEAL') {
      const today = new Date().toISOString().split('T')[0]
      const calories = Math.round(Number(data.calories) || 0)
      const protein = Math.round(Number(data.protein) || 0)
      const carbs = Math.round(Number(data.carbs) || 0)
      const fat = Math.round(Number(data.fat) || 0)

      const { data: record, error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories,
        protein,
        carbs,
        fat,
        logged_at: today,
      }).select().single()

      if (error) {
        console.error('[ACTION] LOG_MEAL error:', error)
        throw error
      }

      await updateDailyAdherence(today)
      await updateJourneyProgress()

      return NextResponse.json({ success: true, action: 'logged', data: record })
    }

    if (type === 'UPDATE_MEAL') {
      let mealId = data.mealId
      // Sanitization: Remove [ID:...] or ID: prefixes
      if (typeof mealId === 'string') {
        mealId = mealId.replace(/^\[?ID:/i, '').replace(/\]$/, '').trim()
      }

      const calories = Math.round(Number(data.calories) || 0)
      const protein = Math.round(Number(data.protein) || 0)
      const carbs = Math.round(Number(data.carbs) || 0)
      const fat = Math.round(Number(data.fat) || 0)

      const { data: record, error } = await supabase.from('meal_logs')
        .update({
          food_name: data.foodName,
          calories,
          protein,
          carbs,
          fat,
        })
        .eq('id', mealId)
        .eq('user_id', user.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('[ACTION] UPDATE_MEAL error:', error)
        throw error
      }
      if (!record) return NextResponse.json({ error: 'Không tìm thấy bữa ăn để cập nhật.' }, { status: 404 })

      const today = record.logged_at || new Date().toISOString().split('T')[0]
      await updateDailyAdherence(today)
      await updateJourneyProgress()

      return NextResponse.json({ success: true, action: 'updated', data: record })
    }

    if (type === 'DELETE_MEAL') {
      const { data: targetMeal } = await supabase.from('meal_logs').select('logged_at').eq('id', data.mealId).single()

      const { error } = await supabase.from('meal_logs')
        .delete()
        .eq('id', data.mealId)
        .eq('user_id', user.id)

      if (error) {
        console.error('[ACTION] DELETE_MEAL error:', error)
        throw error
      }

      if (targetMeal) {
        await updateDailyAdherence(targetMeal.logged_at)
        await updateJourneyProgress()
      }

      return NextResponse.json({ success: true, action: 'deleted' })
    }

    if (type === 'UPDATE_GOAL') {
      const { error } = await supabase.from('profiles')
        .update({ daily_calorie_goal: data.daily_calorie_goal })
        .eq('id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'goal_updated' })
    }

    if (type === 'LOG_WATER') {
      const amount = Number(data.amount_ml ?? 0)
      if (!Number.isFinite(amount) || amount === 0) {
        return NextResponse.json({ error: 'Invalid water amount' }, { status: 400 })
      }

      const today = new Date().toISOString().split('T')[0]

      // 1) Update daily_habits (this is what dashboard + monthly chart uses)
      const { data: existingHabits } = await supabase
        .from('daily_habits')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      const currentHabits = existingHabits?.water_ml ?? 0
      const newTotal = Math.max(0, currentHabits + amount)

      const { error: habitsErr } = await supabase
        .from('daily_habits')
        .upsert(
          { user_id: user.id, date: today, water_ml: newTotal },
          { onConflict: 'user_id,date' }
        )
      if (habitsErr) throw habitsErr

      // 2) Sync profiles water (used by adherence/journey)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ water_ml_today: newTotal, water_updated_date: today })
        .eq('id', user.id)
      if (profileErr) throw profileErr

      // 3) Recompute adherence + journey
      await updateDailyAdherence(today)
      await updateJourneyProgress()

      return NextResponse.json({ success: true, action: 'water_logged', total: newTotal })
    }

    return NextResponse.json({ error: 'Unknown action type' }, { status: 400 })
  } catch (error) {
    console.error('Action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

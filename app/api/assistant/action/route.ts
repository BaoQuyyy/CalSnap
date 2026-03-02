import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (type === 'LOG_MEAL') {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories: data.calories,
        protein: data.protein ?? 0,
        carbs: data.carbs ?? 0,
        fat: data.fat ?? 0,
        logged_at: today,
      })
      if (error) throw error
      return NextResponse.json({ success: true, action: 'logged' })
    }

    if (type === 'UPDATE_MEAL') {
      const { error } = await supabase.from('meal_logs')
        .update({
          food_name: data.foodName,
          calories: data.calories,
          protein: data.protein ?? 0,
          carbs: data.carbs ?? 0,
          fat: data.fat ?? 0,
        })
        .eq('id', data.mealId)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'updated' })
    }

    if (type === 'DELETE_MEAL') {
      const { error } = await supabase.from('meal_logs')
        .delete()
        .eq('id', data.mealId)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'deleted' })
    }

    if (type === 'UPDATE_GOAL') {
      const { error } = await supabase.from('profiles')
        .update({ daily_calorie_goal: data.daily_calorie_goal })
        .eq('id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'goal_updated' })
    }

    return NextResponse.json({ error: 'Unknown action type' }, { status: 400 })
  } catch (error) {
    console.error('Action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

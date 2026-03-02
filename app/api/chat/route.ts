// app/api/assistant/route.ts
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, imageBase64, history } = await req.json()

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    const [{ data: profile }, { data: todayMeals }, { data: adherence }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_logs').select('food_name, calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', today),
      supabase.from('plan_adherence').select('*').eq('user_id', user.id).eq('date', today).single(),
    ])

    const plan = profile?.fitness_plan as any
    const actualCalories = todayMeals?.reduce((s, m) => s + m.calories, 0) ?? 0
    const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
    const caloriesLeft = calorieGoal - actualCalories

    const systemPrompt = `Ban la tro ly AI ca nhan cua CalSnap voi quyen truy cap day du du lieu dinh duong cua nguoi dung.

DU LIEU HOM NAY (${today}):
- Da an: ${actualCalories} / ${calorieGoal} kcal (con ${caloriesLeft} kcal)
- Protein: ${adherence?.protein_actual ?? 0}g / ${adherence?.protein_goal ?? plan?.daily_protein_g ?? 0}g
- Carbs: ${adherence?.carbs_actual ?? 0}g / ${adherence?.carbs_goal ?? plan?.daily_carbs_g ?? 0}g
- Fat: ${adherence?.fat_actual ?? 0}g / ${adherence?.fat_goal ?? plan?.daily_fat_g ?? 0}g

CAC BUA AN HOM NAY:
${todayMeals?.map(m => `- ${m.food_name}: ${m.calories} kcal (P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join('\n') || '- Chua co bua nao'}

THONG TIN CA NHAN:
- Muc tieu: ${profile?.goal ?? 'chua set'}
- Can nang: ${profile?.weight_kg ?? '?'}kg -> muc tieu ${profile?.target_weight_kg ?? '?'}kg
- Streak: ${profile?.journey_streak ?? 0} ngay
${plan ? `- Plan: ${plan.daily_calories} kcal, ${plan.daily_protein_g}g protein, tap ${plan.weekly_workouts}x/tuan` : ''}

QUY TAC:
- Ngan gon, than thien, khuyen khich
- Dung tieng Viet neu user viet tieng Viet
- Uoc tinh macro theo suat an Viet Nam dien hinh`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const parts: any[] = []
    if (message?.trim()) parts.push({ text: message.trim() })
    if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
    if (parts.length === 0) parts.push({ text: 'Xin chao' })

    const chatHistory = (history ?? [])
      .filter((m: any) => m.content?.trim())
      .map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'System context: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Da hieu! Toi san sang ho tro ban.' }] },
        ...chatHistory,
      ],
    })

    const result = await chat.sendMessage(parts)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Assistant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

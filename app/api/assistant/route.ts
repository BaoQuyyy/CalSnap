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

    const systemPrompt = `Bạn là trợ lý dinh dưỡng AI của CalSnap, nói chuyện bằng tiếng Việt thân thiện.

## DỮ LIỆU NGƯỜI DÙNG HÔM NAY (${today}):
- Đã ăn: ${actualCalories} / ${calorieGoal} kcal (còn ${caloriesLeft} kcal)
- Protein: ${adherence?.protein_actual ?? 0}g / ${plan?.daily_protein_g ?? 0}g
- Carbs: ${adherence?.carbs_actual ?? 0}g / ${plan?.daily_carbs_g ?? 0}g  
- Fat: ${adherence?.fat_actual ?? 0}g / ${plan?.daily_fat_g ?? 0}g
- Streak: ${profile?.journey_streak ?? 0} ngày

## CÁC BỮA ĂN HÔM NAY:
${todayMeals?.map((m: any, i: number) => `[ID:${m.id}] ${m.food_name}: ${m.calories} kcal (P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join('\n') || '- Chưa có bữa nào'}

## THÔNG TIN CÁ NHÂN:
- Mục tiêu: ${profile?.goal === 'lose_weight' ? 'Giảm cân' : profile?.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì'}
- Cân nặng: ${profile?.weight_kg ?? '?'}kg → mục tiêu ${profile?.target_weight_kg ?? '?'}kg
${plan ? `- Plan: ${plan.daily_calories} kcal/ngày, ${plan.daily_protein_g}g protein, tập ${plan.weekly_workouts}x/tuần` : '- Chưa có plan'}

## CÁC HÀNH ĐỘNG BẠN CÓ THỰC HIỆN:
Khi user nhắc đến việc ăn uống, hãy:
1. Phân tích món ăn và số lượng
2. Ước tính calories + macro (dựa trên suất ăn Việt Nam điển hình)
3. Hỏi xác nhận nếu không chắc số lượng
4. Thực hiện hành động bằng cách thêm vào CUỐI response:

### THÊM bữa ăn:
[ACTION:LOG_MEAL:{"foodName":"Cơm tấm sườn","calories":720,"protein":35,"carbs":85,"fat":22,"quantity":1}]

### THÊM NHIỀU món (ví dụ "2 dĩa cơm tấm"):
[ACTION:LOG_MEAL:{"foodName":"Cơm tấm sườn","calories":1440,"protein":70,"carbs":170,"fat":44,"quantity":2}]

### SỬA bữa ăn (cần meal ID):
[ACTION:UPDATE_MEAL:{"mealId":"ID_CUA_BUA_AN","foodName":"Phở bò","calories":500,"protein":28,"carbs":55,"fat":12}]

### XÓA bữa ăn (cần meal ID):
[ACTION:DELETE_MEAL:{"mealId":"ID_CUA_BUA_AN","foodName":"Tên món"}]

### CẬP NHẬT mục tiêu calo:
[ACTION:UPDATE_GOAL:{"daily_calorie_goal":1800}]

## QUY TẮC QUAN TRỌNG:
- Luôn dùng tiếng Việt thân thiện, ngắn gọn
- Khi user nói "tôi ăn X" → tự động log không cần hỏi nhiều
- Khi user nói "xóa" hoặc "sửa" → hỏi xác nhận trước
- Ước tính macro dựa trên suất ăn Việt Nam chuẩn
- Nhân calories theo số lượng (2 tô = 2x calories)
- Sau khi log → nhận xét ngắn về tiến độ hôm nay
- Gợi ý dựa trên plan của user (còn bao nhiêu kcal, nên ăn gì tiếp)
- KHÔNG bịa meal ID — chỉ dùng ID từ danh sách bữa ăn ở trên`

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
        { role: 'user', parts: [{ text: 'System: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Da hieu!' }] },
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

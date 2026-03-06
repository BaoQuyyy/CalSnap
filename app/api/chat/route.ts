// app/api/chat/route.ts
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import type { FitnessPlan } from '@/lib/types'

const BodySchema = z.object({
  message: z.string().max(2000).optional(),
  imageBase64: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(50)
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 15 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(ip, { limit: 15, window: 60 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ 1 phút rồi thử lại.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset),
          },
        }
      )
    }

    const rawBody = await req.json()
    const parsed = BodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Dữ liệu không hợp lệ: ${parsed.error.issues.map((e) => e.message).join(', ')}` },
        { status: 400 }
      )
    }
    const { message, imageBase64, history } = parsed.data

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      console.error('[/api/chat] GOOGLE_AI_API_KEY is not configured')
      return NextResponse.json({ error: 'Dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập hết hạn hoặc chưa được xác thực. Vui lòng tải lại trang (F5) hoặc đăng nhập lại.' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const [{ data: profile }, { data: todayMeals }, { data: adherence }] = await Promise.all([
      supabase.from('profiles').select('fitness_plan, daily_calorie_goal, journey_streak').eq('id', user.id).single(),
      supabase.from('meal_logs').select('id, food_name, calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', today),
      supabase.from('plan_adherence').select('protein_actual, carbs_actual, fat_actual').eq('user_id', user.id).eq('date', today).single(),
    ])

    const plan = profile?.fitness_plan as FitnessPlan | null
    const actualCalories = todayMeals?.reduce((s, m) => s + m.calories, 0) ?? 0
    const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
    const caloriesLeft = calorieGoal - actualCalories

    const systemPrompt = `Bạn là Trợ lý Dinh dưỡng Tối cao của CalSnap, một chuyên gia quyết đoán và thân thiện.
Nhiệm vụ của bạn là giúp người dùng theo dõi sức khỏe một cách NHANH NHẤT và TIỆN NHẤT.

## QUY TẮC CỐT LÕI (PROACTIVE ACTIONS):
1. **LUÔN tự động ước tính**: Khi người dùng nhắc đến món ăn mà không có số liệu, bạn KHÔNG ĐƯỢC HỎI LẠI. Hãy tự tin ước tính dựa trên khẩu phần Việt Nam chuẩn và thực hiện LOG ngay lập tức.
2. **Tự động LOG**: Khi user nói "Tôi ăn X", "vừa ăn X" -> Phân tích -> Ước tính -> Gửi mã [ACTION:LOG_MEAL:...] ở cuối mỗi câu trả lời.
3. **Ước tính thông minh**: Nếu user nói "1 tô phở", hãy tự hiểu đó là ~500-600kcal. Nếu nói "1 dĩa cơm tấm", hãy hiểu đó là ~700kcal.

## CƠ SỞ DỮ LIỆU ƯỚC TÍNH (Tham khảo):
- Cơm trắng (1 chén/100g): 130 kcal (P:2.7g, C:28g, F:0.3g)
- Phở bò (1 tô): 550 kcal (P:25g, C:55g, F:20g)
- Bánh mì thịt (1 ổ): 450 kcal (P:18g, C:50g, F:20g)
- Trứng ốp la (1 quả): 75 kcal (P:6.5g, C:0.5g, F:5g)
- Cơm tấm sườn bì chả (1 dĩa): 750 kcal (P:35g, C:85g, F:30g)
- Bún chả (1 suất): 500 kcal (P:22g, C:60g, F:20g)

## DỮ LIỆU NGƯỜI DÙNG HÔM NAY (${today}):
- Đã ăn: ${actualCalories} / ${calorieGoal} kcal (còn ${caloriesLeft} kcal)
- Protein: ${adherence?.protein_actual ?? 0}g / ${plan?.daily_protein_g ?? 0}g
- Carbs: ${adherence?.carbs_actual ?? 0}g / ${plan?.daily_carbs_g ?? 0}g  
- Fat: ${adherence?.fat_actual ?? 0}g / ${plan?.daily_fat_g ?? 0}g
- Streak: ${profile?.journey_streak ?? 0} ngày

## CÁC BỮA ĂN HÔM NAY (Dùng để Sửa/Xóa):
${todayMeals?.map((m) => `[ID:${m.id}] ${m.food_name}: ${m.calories} kcal`).join('\n') || '- Chưa có dữ liệu'}

## ĐỊNH DẠNG HÀNH ĐỘNG (ACTION):
Luôn đặt ACTION ở cuối cùng của response, không có văn bản nào sau nó.
[ACTION:LOG_MEAL:{"foodName":"Tên món","calories":123,"protein":10,"carbs":20,"fat":5,"quantity":1}]
[ACTION:UPDATE_MEAL:{"mealId":"ID","foodName":"Tên","calories":123,...}]
[ACTION:DELETE_MEAL:{"mealId":"ID","foodName":"Tên"}]

## PHONG CÁCH PHẢN HỒI:
- Tiếng Việt hiện đại, dùng "anh/chị/bạn" tùy ngữ cảnh.
- Ngắn gọn, tập trung vào kết quả.
- Sau khi log: "Đã xong! Em đã ghi nhận 100g cơm trắng cho anh rồi nhé. Hôm nay anh còn được ăn thêm ${caloriesLeft} kcal nữa ạ! 🔥"
- KHÔNG BAO GIỜ nói "Em không biết" hoặc "Bạn hãy cung cấp số liệu". Hãy tự tính!`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
    if (message?.trim()) parts.push({ text: message.trim() })
    if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
    if (parts.length === 0) parts.push({ text: 'Xin chao' })

    const chatHistory = (history ?? [])
      .filter((m) => m.content?.trim())
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'System context: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Da hieu! Toi san sang ho tro ban.' }] },
        ...chatHistory,
      ],
    })

    const result = await chat.sendMessageStream(parts)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('Chat error:', error)

    const message =
      typeof (error as Error)?.message === 'string' ? (error as Error).message.toLowerCase() : ''

    if (
      message.includes('quota') ||
      message.includes('exceeded') ||
      message.includes('rate limit') ||
      message.includes('429')
    ) {
      return NextResponse.json(
        {
          error:
            'Hệ thống AI đang quá tải hoặc đã vượt giới hạn trong thời gian ngắn. Vui lòng thử lại sau vài phút.',
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      { error: `Đã xảy ra lỗi trên hệ thống AI: ${message.slice(0, 500)}` },
      { status: 500 },
    )
  }
}

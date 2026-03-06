// app/api/assistant/route.ts
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import type { FitnessPlan } from '@/lib/types'

const BodySchema = z.object({
  message: z.string().max(2000).optional().default(''),
  imageBase64: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(50)
    .optional()
    .default([]),
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
      console.error('[/api/assistant] GOOGLE_AI_API_KEY is not configured')
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
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [{ data: profile }, { data: recentMeals }, { data: adherence }] = await Promise.all([
      supabase.from('profiles').select('fitness_plan, daily_calorie_goal, journey_streak').eq('id', user.id).maybeSingle(),
      supabase.from('meal_logs')
        .select('id, food_name, calories, protein, carbs, fat, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', twoDaysAgo)
        .order('logged_at', { ascending: false }),
      supabase.from('plan_adherence').select('protein_actual, carbs_actual, fat_actual').eq('user_id', user.id).eq('date', today).maybeSingle(),
    ])

    const plan = profile?.fitness_plan as FitnessPlan | null
    const actualCalories = recentMeals?.filter(m => m.logged_at === today).reduce((s, m) => s + m.calories, 0) ?? 0
    const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
    const caloriesLeft = calorieGoal - actualCalories

    const systemPrompt = `Bạn là CalSnap AI - người người bạn đồng hành cực kỳ tận tâm và thông minh. 💖

## PHONG CÁCH (DỄ THƯƠNG & XỊN XÒ):
- Nói chuyện thân thiện, dùng "nha", "nhé ạ", "nè".
- Cổ vũ người dùng tối đa.

## QUY TẮC THÔNG MINH (BẮT BUỘC):
1. Trả lời dưới 70 từ. Không dùng **.
2. Nếu người dùng lệnh rõ ràng (VD: "Sửa món gà rán thành 100kcal") -> Thực hiện [ACTION:...] NGAY LẬP TỨC.
3. Chỉ hỏi lại "Có phải món này không?" khi có nhiều món trùng tên hoặc anh chưa nói rõ muốn sửa thành bao nhiêu.
4. TUYỆT ĐỐI không hiển thị mã [ID:...] cho người dùng.
5. "mealId" trong ACTION phải là UUID thuần túy lấy từ danh sách dưới.

## DỮ LIỆU DINH DƯỠNG (HÔM NAY):
- Calo: ${actualCalories}/${calorieGoal} kcal (còn ${caloriesLeft})
- Macros: P:${adherence?.protein_actual ?? 0}g C:${adherence?.carbs_actual ?? 0}g F:${adherence?.fat_actual ?? 0}g

## DANH SÁCH MÓN ĂN (2 NGÀY GẦN NHẤT):
${recentMeals?.map((m) => `[ID:${m.id}] ${m.food_name} (${m.logged_at}): ${m.calories} kcal`).join('\n') || '- Chưa có dữ liệu'}

## HÀNH ĐỘNG (Đặt ở CUỐI):
- Thêm: [ACTION:LOG_MEAL:{"foodName":"...","calories":...,"protein":...,"carbs":...,"fat":...}]
- Sửa: [ACTION:UPDATE_MEAL:{"mealId":"...","foodName":"...","calories":...,"protein":...,"carbs":...,"fat":...}]
- Xoá: [ACTION:DELETE_MEAL:{"mealId":"..."}]
- Mục tiêu: [ACTION:UPDATE_GOAL:{"daily_calorie_goal":...}]`

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
        { role: 'user', parts: [{ text: 'System: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Da hieu!' }] },
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
    console.error('Assistant API Full Error:', error)

    const errorDetail = (error as Error)?.message || 'Unknown'
    const message = errorDetail.toLowerCase()

    if (
      message.includes('quota') ||
      message.includes('exceeded') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('resource_exhausted')
    ) {
      return NextResponse.json(
        {
          error:
            'Hệ thống AI đang quá tải hoặc đã vượt giới hạn trong thời gian ngắn. Vui lòng thử lại sau vài phút.',
          details: message
        },
        { status: 429 },
      )
    }

    if (message.includes('safety') || message.includes('blocked')) {
      return NextResponse.json(
        { error: 'Lỗi hệ thống AI. Vui lòng thử lại sau ít phút.', details: errorDetail },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: `Lỗi kết nối AI: ${errorDetail.slice(0, 500)}`,
        suggestion: 'Bạn hãy kiểm tra lại kết nối mạng hoặc thử tắt VPN/Proxy nếu đang bật nhé.'
      },
      { status: 500 },
    )
  }
}

// app/api/assistant/route.ts
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

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

    const systemPrompt = `Bạn là trợ lý dinh dưỡng AI cá nhân của CalSnap, nói chuyện nhẹ nhàng, niềm nở, luôn ưu tiên sức khoẻ và an toàn của người dùng. Bạn CHỈ trả lời các câu hỏi liên quan đến dinh dưỡng, ăn uống, sức khoẻ, luyện tập, thói quen sống lành mạnh. Nếu câu hỏi ngoài chủ đề (ví dụ: lập trình, tài chính, chuyện tình cảm, chính trị, v.v.) thì hãy từ chối khéo léo bằng tiếng Việt và gợi ý người dùng hỏi lại về dinh dưỡng/fitness.

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

### LOG LƯỢNG NƯỚC UỐNG:
- Khi user nói họ uống nước (ví dụ: "mình vừa uống thêm 2 chai nước suối", "uống thêm 500ml nước lọc"), hãy:
  1) Ước lượng chính xác tổng ml nước (một chai thường ~500ml trừ khi user nói khác).
  2) Trả lời giải thích lợi ích của việc uống nước, và cập nhật tiến độ nước theo plan.
  3) Thêm ACTION ở CUỐI câu trả lời:
[ACTION:LOG_WATER:{"amount_ml":1000}]

### LƯU Ý VỀ MỤC TIÊU VÀ CHỈ SỐ:
- Nếu người dùng đặt các mục tiêu hoặc chỉ số NGUY HIỂM (ví dụ: cân nặng mục tiêu < 40kg, giảm >1kg/tuần, mục tiêu calories < 1,000 kcal/ngày, BMI < 17 hoặc > 35, thay đổi rất đột ngột so với hiện tại), bạn KHÔNG cập nhật ngay mà:
  1) Nhẹ nhàng hỏi lại: "Bạn chắc chắn chứ? Mục tiêu này có thể hơi cực đoan/không an toàn."
  2) Đề xuất phạm vi an toàn hơn dựa trên dữ liệu hiện tại.
  3) Chỉ khi người dùng khẳng định rõ ràng, mới thêm ACTION cập nhật (UPDATE_GOAL hoặc gợi ý cập nhật profile).

## QUY TẮC QUAN TRỌNG:
- Luôn dùng tiếng Việt thân thiện, tích cực, khuyến khích; tránh phán xét.
- Khi user nói "tôi ăn X" → tự động log không cần hỏi nhiều, nhưng nếu thông tin mơ hồ thì hỏi lại 1–2 câu đơn giản để rõ hơn.
- Khi user nói "tôi uống X" → hãy hiểu là log nước uống (nước lọc/nước suối/không calo), tính ra ml nước và dùng ACTION LOG_WATER.
- Khi user nói "xóa" hoặc "sửa" → hỏi xác nhận trước rồi mới tạo ACTION.
- Khi user thay đổi mục tiêu (cân nặng, calories, tần suất tập luyện, v.v.) theo hướng quá cực đoan, hãy HỎI LẠI NHẸ NHÀNG trước, giải thích ngắn gọn vì sao có thể không an toàn.
- Ước tính macro dựa trên suất ăn Việt Nam chuẩn, và nhân calories theo số lượng (2 tô = 2x calories).
- Sau khi log → nhận xét ngắn về tiến độ hôm nay, gợi ý nhẹ nhàng món/khẩu phần phù hợp với plan và sở thích (dùng thông tin các món người dùng hay ăn/thích nếu có).
- KHÔNG bịa meal ID — chỉ dùng ID từ danh sách bữa ăn ở trên.
- Nếu câu hỏi KHÔNG liên quan dinh dưỡng/sức khoẻ/luyện tập, hãy trả lời kiểu: "Mình chỉ có thể hỗ trợ bạn về ăn uống và luyện tập thôi, bạn thử hỏi mình về bữa ăn hoặc mục tiêu sức khoẻ nhé."
- ĐỘ DÀI: Bạn PHẢI trả lời cực kỳ NGẮN GỌN, SÚC TÍCH (dưới 100 từ).
- ĐỊNH DẠNG (CLEAN UI) - QUY TẮC BẮT BUỘC:
  1. TUYỆT ĐỐI KHÔNG dùng dấu sao (** hoặc *) để in đậm hoặc in nghiêng bất kỳ từ nào (kể cả tên món ăn, con số, hay tiêu đề).
  2. CHỈ dùng văn bản thuần túy.
  3. Dùng duy nhất dấu gạch ngang (-) ở đầu dòng cho danh sách.
  4. Ví dụ SAI: **Ức gà**: 165 kcal.
  5. Ví dụ ĐÚNG: - Ức gà: 165 kcal.
- KHÔNG hiển thị thông tin Streak (Chuỗi ngày) trong phần tóm tắt dinh dưỡng hằng ngày trừ khi người dùng hỏi trực tiếp.`

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
  } catch (error: any) {
    console.error('Assistant error:', error)

    const message =
      typeof error?.message === 'string' ? error.message.toLowerCase() : ''

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
      { error: 'Đã xảy ra lỗi trên hệ thống AI. Vui lòng thử lại sau.' },
      { status: 500 },
    )
  }
}

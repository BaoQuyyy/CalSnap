import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const ImageBodySchema = z.object({
    image: z.string().min(10, 'Image data is required'),
    textOnly: z.undefined().optional(),
})

const TextBodySchema = z.object({
    textOnly: z.literal(true),
    foodNameHint: z.string().min(1, 'foodNameHint is required'),
})

const BodySchema = z.union([TextBodySchema, ImageBodySchema])

const IMAGE_PROMPT = `Bạn là chuyên gia dinh dưỡng, trả lời bằng tiếng Việt.
Phân tích món ăn trong bức ảnh và TRẢ VỀ DUY NHẤT một JSON với cấu trúc:
{ 
  "foodName": string, 
  "calories": number, 
  "protein": number, 
  "carbs": number, 
  "fat": number, 
  "confidence": "high" | "medium" | "low",
  "suggestions": string[] 
}.

YÊU CẦU:
- "foodName" phải là tên món ăn tiếng Việt nếu có thể (ví dụ: "Bánh xèo", "Phở bò", "Cơm tấm sườn").
- "suggestions" phải là mảng 3 chuỗi gợi ý điều chỉnh khẩu phần THỰC TẾ và CỤ THỂ theo trọng lượng hoặc đơn vị phổ biến (ví dụ: "100g cơm trắng", "Thêm 1 quả trứng", "Tô lớn hơn", "Bớt mỡ/dầu"). Ưu tiên các đơn vị gram (g) nếu là món tinh bột/đạm.
- Không thêm bất kỳ giải thích, markdown hoặc text nào ngoài JSON.
- Nếu không phát hiện được món ăn, trả về: { "error": "No food detected" }.`

const TEXT_PROMPT_PREFIX = `Bạn là chuyên gia dinh dưỡng, trả lời bằng tiếng Việt.
Người dùng sẽ mô tả bữa ăn HOẶC điều chỉnh thêm món/khẩu phần.
Dựa trên mô tả đó, hãy ƯỚC TÍNH LẠI toàn bộ giá trị dinh dưỡng CHO CẢ BỮA và TRẢ VỀ DUY NHẤT một JSON với cấu trúc:
{ 
  "foodName": string, 
  "calories": number, 
  "protein": number, 
  "carbs": number, 
  "fat": number, 
  "confidence": "high" | "medium" | "low",
  "suggestions": string[]
}.

YÊU CẦU:
- "foodName" là mô tả bữa ăn sau khi điều chỉnh.
- "suggestions" là 2-3 gợi ý điều chỉnh tiếp theo cực kỳ cụ thể (ví dụ: "Thêm 50g ức gà", "Ít đường hơn").
- Không thêm giải thích hay markdown, CHỈ JSON.

Mô tả từ người dùng: `

export async function POST(req: NextRequest) {
    // Rate limit: 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(ip, { limit: 10, window: 60 })
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

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey || apiKey.length < 10 || apiKey.startsWith('your_')) {
        console.error('[/api/analyze] GOOGLE_AI_API_KEY is not configured')
        return NextResponse.json(
            { error: 'Google AI API key chua duoc cau hinh. Them GOOGLE_AI_API_KEY vao .env.local va restart server.' },
            { status: 500 }
        )
    }

    try {
        const rawBody = await req.json()
        const zodResult = BodySchema.safeParse(rawBody)
        if (!zodResult.success) {
            return NextResponse.json(
                { error: `Dữ liệu không hợp lệ: ${zodResult.error.issues.map((e) => e.message).join(', ')}` },
                { status: 400 }
            )
        }
        const body = zodResult.data

        // Text-only adjustment mode
        if ('textOnly' in body && body.textOnly) {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

            const result = await model.generateContent([
                TEXT_PROMPT_PREFIX + body.foodNameHint,
            ])

            const response = await result.response
            const content = response.text()

            const jsonMatch = content?.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ. Thử lại.' }, { status: 500 })
            }

            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.error) {
                return NextResponse.json({ error: parsed.error })
            }

            const { foodName, calories, protein, carbs, fat, confidence, suggestions } = parsed
            if (typeof foodName !== 'string') {
                return NextResponse.json({ error: 'AI không thể tính đủ thông tin dinh dưỡng.' }, { status: 500 })
            }

            return NextResponse.json({
                result: {
                    foodName,
                    calories: Math.round(Number(calories) || 0),
                    protein: Math.round((Number(protein) || 0) * 10) / 10,
                    carbs: Math.round((Number(carbs) || 0) * 10) / 10,
                    fat: Math.round((Number(fat) || 0) * 10) / 10,
                    confidence: confidence ?? 'medium',
                    suggestions: Array.isArray(suggestions) ? suggestions : [],
                },
            })
        }

        // Default: image mode
        const { image } = body

        if (!image || typeof image !== 'string') {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
        }

        const matches = image.match(/^data:(.+);base64,(.+)$/)
        if (!matches) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
        }
        const mimeType = matches[1] as string
        const base64Data = matches[2] as string

        const approximateSizeBytes = (base64Data.length * 3) / 4
        if (approximateSizeBytes > 4 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Anh qua lon. Vui long dung anh duoi 4 MB.' },
                { status: 400 }
            )
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                    data: base64Data,
                },
            },
            IMAGE_PROMPT,
        ])

        const response = await result.response
        const content = response.text()

        if (!content) {
            return NextResponse.json({ error: 'Không nhận được phản hồi từ AI.' }, { status: 500 })
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('[/api/analyze] Cannot parse JSON from:', content)
            return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ. Thử lại.' }, { status: 500 })
        }

        const aiJson = JSON.parse(jsonMatch[0])

        if (aiJson.error) {
            return NextResponse.json({ error: aiJson.error })
        }

        const { foodName, calories, protein, carbs, fat, confidence, suggestions } = aiJson

        if (typeof foodName !== 'string') {
            console.error('[/api/analyze] Incomplete data:', aiJson)
            return NextResponse.json({ error: 'AI không thể tính đủ thông tin dinh dưỡng. Thử ảnh rõ hơn.' }, { status: 500 })
        }

        return NextResponse.json({
            result: {
                foodName,
                calories: Math.round(Number(calories) || 0),
                protein: Math.round((Number(protein) || 0) * 10) / 10,
                carbs: Math.round((Number(carbs) || 0) * 10) / 10,
                fat: Math.round((Number(fat) || 0) * 10) / 10,
                confidence: confidence ?? 'medium',
                suggestions: Array.isArray(suggestions) ? suggestions : [],
            },
        })
    } catch (err: any) {
        console.error('[/api/analyze] CRITICAL ERROR:', err)
        const message = err?.message || 'Unknown error'

        if (message.includes('API_KEY_INVALID') || message.includes('401')) {
            return NextResponse.json({ error: 'Google AI API key không hợp lệ.' }, { status: 500 })
        }
        if (message.includes('quota') || message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
            return NextResponse.json({ error: 'Đã vượt giới hạn Gemini (15 yêu cầu/phút). Vui lòng chờ khoảng 1 phút rồi thử lại.' }, { status: 500 })
        }
        if (message.includes('safety') || message.includes('blocked')) {
            return NextResponse.json({ error: 'Yêu cầu bị chặn bởi bộ lọc an toàn của AI. Thử lại với nội dung khác.' }, { status: 500 })
        }

        return NextResponse.json({ error: `Lỗi AI (${message.slice(0, 50)}...): Vui lòng thử lại.` }, { status: 500 })
    }
}

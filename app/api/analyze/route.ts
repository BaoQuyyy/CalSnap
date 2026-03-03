import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rateLimit } from '@/lib/rate-limit'

const IMAGE_PROMPT = `Bạn là chuyên gia dinh dưỡng, trả lời bằng tiếng Việt.
Phân tích món ăn trong bức ảnh và TRẢ VỀ DUY NHẤT một JSON với cấu trúc:
{ "foodName": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "high" | "medium" | "low" }.

YÊU CẦU:
- "foodName" phải là tên món ăn tiếng Việt nếu có thể (ví dụ: "Bánh xèo", "Phở bò", "Cơm tấm sườn").
- Không thêm bất kỳ giải thích, markdown hoặc text nào ngoài JSON.
- Nếu không phát hiện được món ăn, trả về: { "error": "No food detected" }.`

const TEXT_PROMPT_PREFIX = `Bạn là chuyên gia dinh dưỡng, trả lời bằng tiếng Việt.
Người dùng sẽ mô tả bữa ăn HOẶC điều chỉnh thêm món/khẩu phần (ví dụ: "Bánh xèo thêm 1 ly sữa đậu nành", "tô phở lớn hơn", "ít cơm hơn").
Dựa trên mô tả đó, hãy ƯỚC TÍNH LẠI toạ bộ giá trị dinh dưỡng CHO CẢ BỮA (sau khi đã cộng/trừ món mới) và TRẢ VỀ DUY NHẤT một JSON với cấu trúc:
{ "foodName": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "high" | "medium" | "low" }.

YÊU CẦU:
- "foodName" nên là mô tả tiếng Việt rõ ràng của bữa ăn sau khi điều chỉnh.
- Không thêm bất kỳ giải thích hay markdown nào, CHỈ JSON.

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
        const body = await req.json()

        // Text-only adjustment mode (used by AI Portion Assistant)
        if (body.textOnly && typeof body.foodNameHint === 'string') {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

            const result = await model.generateContent([
                TEXT_PROMPT_PREFIX + body.foodNameHint,
            ])

            const content = result.response.text()
            console.log('[/api/analyze:textOnly] Gemini response:', content)

            const jsonMatch = content?.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                return NextResponse.json({ error: 'AI tra ve dinh dang khong hop le. Thu lai.' }, { status: 500 })
            }

            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.error) {
                return NextResponse.json({ error: parsed.error })
            }

            const { foodName, calories, protein, carbs, fat, confidence } = parsed
            if (typeof foodName !== 'string') {
                return NextResponse.json({ error: 'AI khong the tinh du thong tin dinh duong.' }, { status: 500 })
            }

            return NextResponse.json({
                result: {
                    foodName,
                    calories: Math.round(Number(calories) || 0),
                    protein: Math.round((Number(protein) || 0) * 10) / 10,
                    carbs: Math.round((Number(carbs) || 0) * 10) / 10,
                    fat: Math.round((Number(fat) || 0) * 10) / 10,
                    confidence: confidence ?? 'medium',
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

        console.log(`[/api/analyze] Sending ${Math.round(approximateSizeBytes / 1024)} KB image to Gemini`)

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

        const content = result.response.text()
        console.log('[/api/analyze] Gemini response:', content)

        if (!content) {
            return NextResponse.json({ error: 'Khong nhan duoc phan hoi tu AI' }, { status: 500 })
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('[/api/analyze] Cannot parse JSON from:', content)
            return NextResponse.json({ error: 'AI tra ve dinh dang khong hop le. Thu lai.' }, { status: 500 })
        }

        const parsed = JSON.parse(jsonMatch[0])

        if (parsed.error) {
            return NextResponse.json({ error: parsed.error })
        }

        const { foodName, calories, protein, carbs, fat, confidence } = parsed

        if (typeof foodName !== 'string') {
            console.error('[/api/analyze] Incomplete data:', parsed)
            return NextResponse.json({ error: 'AI khong the tinh du thong tin dinh duong. Thu anh ro hon.' }, { status: 500 })
        }

        return NextResponse.json({
            result: {
                foodName,
                calories: Math.round(Number(calories) || 0),
                protein: Math.round((Number(protein) || 0) * 10) / 10,
                carbs: Math.round((Number(carbs) || 0) * 10) / 10,
                fat: Math.round((Number(fat) || 0) * 10) / 10,
                confidence: confidence ?? 'medium',
            },
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[/api/analyze] Error:', message)

        if (message.includes('API_KEY_INVALID') || message.includes('401')) {
            return NextResponse.json({ error: 'Google AI API key khong hop le. Kiem tra lai GOOGLE_AI_API_KEY.' }, { status: 500 })
        }
        if (message.includes('quota') || message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
            return NextResponse.json({ error: 'Da vuot quota Gemini. Vui long thu lai sau it phut.' }, { status: 500 })
        }

        return NextResponse.json({ error: `Loi AI: ${message}` }, { status: 500 })
    }
}

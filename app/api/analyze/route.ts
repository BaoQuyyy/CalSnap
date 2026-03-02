import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `You are a nutrition expert. Analyze the food in this image and return ONLY a JSON object with this structure: { "foodName": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "high" | "medium" | "low" }. If no food is detected, return { "error": "No food detected" }. Do not include any extra text, explanation, or markdown — only the raw JSON object.`

export async function POST(req: NextRequest) {
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
            SYSTEM_PROMPT,
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

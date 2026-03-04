// app/actions/onboarding.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface OnboardingData {
    gender: 'male' | 'female'
    age: number
    height_cm: number
    weight_kg: number
    target_weight_kg: number
    goal: 'lose_weight' | 'maintain' | 'gain_muscle'
    activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

function calculateFallbackPlan(data: OnboardingData) {
    const heightM = data.height_cm / 100
    const bmi = Math.round((data.weight_kg / (heightM ** 2)) * 10) / 10
    const bmi_category =
        bmi < 18.5 ? 'Underweight' :
            bmi < 25 ? 'Normal' :
                bmi < 30 ? 'Overweight' : 'Obese'

    // Mifflin-St Jeor
    const bmr = data.gender === 'male'
        ? Math.round(10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age + 5)
        : Math.round(10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age - 161)

    const activityMultiplier = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    }[data.activity_level]

    const tdee = Math.round(bmr * activityMultiplier)

    const daily_calories =
        data.goal === 'lose_weight' ? tdee - 500 :
            data.goal === 'gain_muscle' ? tdee + 300 :
                tdee

    const daily_protein_g = Math.round(data.weight_kg * 2)
    const daily_carbs_g = Math.round((daily_calories * 0.45) / 4)
    const daily_fat_g = Math.round((daily_calories * 0.25) / 9)
    const water_liters = Math.round(data.weight_kg * 0.033 * 10) / 10

    const weightDiff = Math.abs(data.weight_kg - data.target_weight_kg)
    const estimated_weeks_to_goal = weightDiff === 0 ? 0 : Math.round(weightDiff / 0.5)

    return {
        bmi,
        bmi_category,
        bmr,
        tdee,
        daily_calories,
        daily_protein_g,
        daily_carbs_g,
        daily_fat_g,
        water_liters,
        weekly_workouts: 3,
        workout_duration_minutes: 45,
        workout_types: ['Cardio', 'Strength Training'],
        estimated_weeks_to_goal,
        tips: ['Stay consistent', 'Track your meals', 'Get enough sleep'],
        summary: `Dựa trên chỉ số của bạn (BMI: ${bmi}), mục tiêu ${daily_calories} kcal/ngày sẽ giúp bạn đạt mục tiêu trong khoảng ${estimated_weeks_to_goal} tuần.`,
    }
}

export async function saveOnboarding(data: OnboardingData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Save profile data
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            gender: data.gender,
            age: data.age,
            height_cm: data.height_cm,
            weight_kg: data.weight_kg,
            target_weight_kg: data.target_weight_kg,
            goal: data.goal,
            activity_level: data.activity_level,
        })
        .eq('id', user.id)

    if (profileError) {
        return { error: profileError.message }
    }

    // 2. Generate fitness plan with Gemini
    const prompt = `You are a certified nutritionist and fitness coach. Based on this user profile, create a personalized fitness plan.

User Profile:
- Gender: ${data.gender}
- Age: ${data.age}
- Height: ${data.height_cm} cm
- Current Weight: ${data.weight_kg} kg
- Target Weight: ${data.target_weight_kg} kg
- Goal: ${data.goal}
- Activity Level: ${data.activity_level}

Calculate using Mifflin-St Jeor formula for BMR, then apply activity multiplier for TDEE.

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "bmi": number,
  "bmi_category": "Underweight|Normal|Overweight|Obese",
  "bmr": number,
  "tdee": number,
  "daily_calories": number,
  "daily_protein_g": number,
  "daily_carbs_g": number,
  "daily_fat_g": number,
  "water_liters": number,
  "weekly_workouts": number,
  "workout_duration_minutes": number,
  "workout_types": ["string"],
  "estimated_weeks_to_goal": number,
  "tips": ["string", "string", "string"],
  "summary": "string"
}`

    let fitnessPlan = null

    const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY

    if (!apiKey) {
        // Không có API key: tính từ công thức thay vì hardcode
        fitnessPlan = calculateFallbackPlan(data)
    } else {
        try {
            const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3 },
                    }),
                }
            )

            const geminiData = await geminiRes.json()
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            const cleaned = text.replace(/```json|```/g, '').trim()
            fitnessPlan = JSON.parse(cleaned)
        } catch {
            // Fallback nếu Gemini lỗi — tính từ công thức, không hardcode
            fitnessPlan = calculateFallbackPlan(data)
        }
    }

    // 3. Save fitness plan + mark onboarding complete
    const { error: planError } = await supabase
        .from('profiles')
        .update({
            fitness_plan: fitnessPlan,
            onboarding_completed: true,
            daily_calorie_goal: fitnessPlan.daily_calories,
        })
        .eq('id', user.id)

    if (planError) {
        return { error: planError.message }
    }

    return { success: true, plan: fitnessPlan }
}
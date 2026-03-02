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

    try {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        // Fallback plan nếu Gemini lỗi
        fitnessPlan = {
            bmi: Math.round((data.weight_kg / ((data.height_cm / 100) ** 2)) * 10) / 10,
            bmi_category: 'Normal',
            bmr: 1800,
            tdee: 2200,
            daily_calories: 2000,
            daily_protein_g: 150,
            daily_carbs_g: 200,
            daily_fat_g: 67,
            water_liters: 2.5,
            weekly_workouts: 3,
            workout_duration_minutes: 45,
            workout_types: ['Cardio', 'Strength Training'],
            estimated_weeks_to_goal: 12,
            tips: ['Stay consistent', 'Track your meals', 'Get enough sleep'],
            summary: 'Stay consistent with your nutrition and exercise routine to reach your goal.',
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

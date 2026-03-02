// components/dashboard-page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalorieProgress } from '@/components/calorie-progress'
import { HabitCards } from '@/components/habit-cards'
import { WeeklyReport } from '@/components/weekly-report'
import { WeightCheckin } from '@/components/weight-checkin'
import { JourneyProgress } from '@/components/journey-progress'
import { MacroPill } from '@/components/macro-pill'
import Link from 'next/link'

interface MealSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Profile {
  full_name?: string
  daily_calorie_goal?: number
  journey_score?: number
  journey_streak?: number
  weight_kg?: number
  target_weight_kg?: number
  fitness_plan?: {
    daily_calories: number
    daily_protein_g: number
  } | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayTotals, setTodayTotals] = useState<MealSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [{ data: prof }, { data: meals }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('meal_logs')
          .select('calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .eq('logged_at', today),
      ])

      if (prof) setProfile(prof as any)

      if (meals && meals.length > 0) {
        const totals = (meals as any[]).reduce(
          (acc, m) => ({
            calories: acc.calories + m.calories,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
        setTodayTotals(totals)
      } else {
        setTodayTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 })
      }

      setLoading(false)
    }

    load()
  }, [])

  const plan = profile?.fitness_plan as any
  const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter pb-24">
      {/* Top greeting + quick stats */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="hoverboard-card rounded-[2.5rem] p-6 md:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Good Morning
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {profile?.full_name ?? 'CalSnap user'}
              </h1>
            </div>
            <JourneyProgress
              journeyScore={profile?.journey_score ?? 0}
              streak={profile?.journey_streak ?? 0}
              onTrackDays={0}
              history={[]}
            />
          </div>

          <div className="bg-white/10 rounded-[2rem] p-4 md:p-5">
            {todayTotals && (
              <CalorieProgress
                consumed={todayTotals.calories}
                goal={calorieGoal}
              />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <MacroPill type="protein" value={todayTotals?.protein ?? 0} variant="light" />
              <MacroPill type="carbs" value={todayTotals?.carbs ?? 0} variant="light" />
              <MacroPill type="fat" value={todayTotals?.fat ?? 0} variant="light" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-[2rem] p-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AI-Powered Food Logging
            </p>
            <p className="text-sm text-slate-500">
              Hỏi AI để log bữa ăn, phân tích dinh dưỡng và gợi ý theo plan của bạn.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold"
            >
              Mở AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Habits + weekly + weight */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {/* Daily habits card stack */}
          <HabitCards date={new Date().toISOString().split('T')[0]} initialHabits={null} />
        </div>

        <div className="space-y-4">
          <WeeklyReport data={null} />
          {profile?.weight_kg && profile?.target_weight_kg && (
            <WeightCheckin
              currentWeight={profile.weight_kg}
              targetWeight={profile.target_weight_kg}
              history={[]}
            />
          )}
        </div>
      </div>
    </div>
  )
}


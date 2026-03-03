// components/dashboard-page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HabitCards } from '@/components/habit-cards'
import { WeeklyReport } from '@/components/weekly-report'
import { WeightCheckin } from '@/components/weight-checkin'
import { MacroPill } from '@/components/macro-pill'
import type { Profile as DbProfile } from '@/lib/types'
import { WeeklyChart } from '@/components/weekly-chart'
import { QuickRelog } from '@/components/quick-relog'
import { getMealsForDate, getWeeklyCalories, relogMeal } from '@/app/actions/meals'
import { toast } from 'sonner'
import { MonthlySummaryCard } from '@/components/monthly-summary-card'

interface MealSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [totals, setTotals] = useState<MealSummary | null>(null)
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number }[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(true)
  const [habits, setHabits] = useState<{
    steps: number
    water_ml: number
    exercise_minutes: number
    exercise_calories: number
  } | null>(null)

  const loadHabits = useCallback(async (targetDate: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: habitsRow } = await supabase
      .from('daily_habits')
      .select('steps, water_ml, exercise_minutes, exercise_calories')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle()
    setHabits(habitsRow as any ?? null)
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: meals }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('meal_logs')
            .select('calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .eq('logged_at', date),
        ])

      if (prof) setProfile(prof as DbProfile)

      if (meals && meals.length > 0) {
        const t = (meals as any[]).reduce(
          (acc, m) => ({
            calories: acc.calories + m.calories,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
        setTotals(t)
      } else {
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 })
      }

      await loadHabits(date)

      if (recentMeals.length === 0) {
        try {
          const data = await getMealsForDate('recent')
          setRecentMeals((data as any[]) ?? [])
        } catch {
          // ignore
        }
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    const loadWeekly = async () => {
      setLoadingWeekly(true)
      try {
        const data = await getWeeklyCalories()
        setWeeklyCalories((data as any[]) ?? [])
      } finally {
        setLoadingWeekly(false)
      }
    }
    loadWeekly()
  }, [])

  const plan = profile?.fitness_plan as any
  const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
  const calories = totals?.calories ?? 0
  const exerciseCalories = habits?.exercise_calories ?? 0
  const remaining = calorieGoal - calories
  const pct = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0

  const today = new Date()
  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const headerDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const needsOnboarding =
    !profile?.height_cm || !profile?.age || !profile?.goal || !profile?.activity_level

  const todayStr = new Date().toISOString().split('T')[0]
  const selectedDateObj = new Date(date + 'T12:00:00')
  const dateLabel = selectedDateObj.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const firstName = profile?.full_name?.trim()?.split(' ')?.[0] ?? 'bạn'

  const ringSize = 220
  const ringStroke = 18
  const r = (ringSize - ringStroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  // Exercise goal: tinh tu plan (45 phut * 8 MET * can nang / 60)
  const weightKg = profile?.weight_kg ?? 70
  const workoutDuration = plan?.workout_duration_minutes ?? 45
  const estimatedBurnPerSession = Math.round(workoutDuration * 7 * weightKg / 60)

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter pb-24">
      {/* NutriAI header */}
      <div className="-mx-4 md:-mx-8 nutri-header">
        <div className="relative z-10 px-5 md:px-8 pt-12 pb-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-wide">
                {dateLabel}
              </p>
              <h1 className="text-white text-2xl md:text-3xl font-display font-extrabold mt-1">
                Xin chào, {firstName} 👋
              </h1>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl border border-white/25">
              🧑
            </div>
          </div>

          {/* Ring */}
          <div className="flex justify-center relative">
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              className="drop-shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
            >
              <defs>
                <linearGradient id="nutriRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A8E063" />
                  <stop offset="100%" stopColor="#5CB85C" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.20)"
                strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                fill="none"
                stroke="url(#nutriRing)"
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ / 4}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-white font-display font-extrabold text-5xl leading-none tabular-nums">
                {Math.abs(remaining).toLocaleString()}
              </p>
              <p className="text-white/75 text-xs font-semibold mt-2">
                {remaining >= 0 ? 'kcal còn lại' : 'kcal vượt mục tiêu'}
              </p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex justify-around mt-4">
            <div className="text-center">
              <div className="text-lg">🎯</div>
              <div className="text-white font-display font-extrabold text-lg tabular-nums">
                {calorieGoal.toLocaleString()}
              </div>
              <div className="text-white/65 text-[10px] font-semibold tracking-wide">Mục tiêu</div>
            </div>
            <div className="text-center">
              <div className="text-lg">🍽️</div>
              <div className="text-white font-display font-extrabold text-lg tabular-nums">
                {calories.toLocaleString()}
              </div>
              <div className="text-white/65 text-[10px] font-semibold tracking-wide">Đã ăn</div>
            </div>
            <div className="text-center">
              <div className="text-lg">🔥</div>
              <div className="text-white font-display font-extrabold text-lg tabular-nums">
                {exerciseCalories > 0
                  ? `${exerciseCalories.toLocaleString()}/${estimatedBurnPerSession.toLocaleString()}`
                  : '0'}
              </div>
              <div className="text-white/65 text-[10px] font-semibold tracking-wide">Đã đốt</div>
            </div>
          </div>

          {/* Date strip */}
          <div className="mt-5 flex gap-2">
            <div className="w-full bg-white/15 rounded-2xl p-2 flex gap-1">
              {headerDays.map((d, idx) => {
                const dStr = d.toISOString().split('T')[0]
                const isActive = dStr === date
                const dayLabel = weekdayLabels[d.getDay()]
                const dayCalories =
                  weeklyCalories.find((x) => x.date === dStr)?.calories ?? 0
                const dayPct = calorieGoal > 0 ? Math.round((dayCalories / calorieGoal) * 100) : 0

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDate(dStr)}
                    className={`flex-1 rounded-xl px-1.5 py-2 transition-all text-center ${
                      isActive
                        ? 'bg-white text-[#2E7D32]'
                        : 'bg-transparent text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-[10px] font-semibold ${isActive ? 'text-[#2E7D32]' : 'text-white/80'}`}>
                      {dayLabel}
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full mx-auto mt-1 flex items-center justify-center text-[10px] font-bold ${
                        dayPct > 100
                          ? isActive ? 'bg-red-500 text-white' : 'bg-red-400 text-white'
                          : isActive ? 'bg-[#2E7D32] text-white' : 'bg-white/15 text-white'
                      }`}
                      title={`${dayCalories.toLocaleString()} kcal`}
                    >
                      {dayPct}%
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content grid below header */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)]">
        {/* Left: macros + habits */}
        <div className="space-y-4">
          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dinh dưỡng hôm nay
              </p>
              <span className="text-[11px] font-semibold text-slate-500">
                {date === todayStr ? 'Hôm nay' : date}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <MacroPill type="protein" value={totals?.protein ?? 0} />
              <MacroPill type="carbs" value={totals?.carbs ?? 0} />
              <MacroPill type="fat" value={totals?.fat ?? 0} />
            </div>
          </div>

          <HabitCards
            key={`habits-${date}-${habits?.exercise_calories ?? 0}`}
            date={date}
            initialHabits={habits}
            onUpdate={() => loadHabits(date)}
          />
          <MonthlySummaryCard />
        </div>

        {/* Right: AI tools + charts + relog */}
        <div className="space-y-4">
          <div className="glass-card rounded-[2rem] p-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trợ lý AI
            </p>
            <p className="text-sm font-black text-slate-800">
              Hỏi nhanh để log bữa ăn và tối ưu mục tiêu hôm nay.
            </p>
            <div className="mt-1 mb-2">
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3 py-2">
                <span className="text-lg">✨</span>
                <p className="text-xs text-slate-500">
                  Bạn còn{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.max(0, remaining).toLocaleString()} kcal
                  </span>{' '}
                  để đạt mục tiêu. Thử hỏi AI gợi ý bữa tiếp theo.
                </p>
              </div>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold"
            >
              Mở AI Assistant
            </Link>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Chat', icon: '💬', href: '/chat' },
                { label: 'Scan', icon: '📸', href: '/scan' },
                { label: 'Log', icon: '📓', href: '/log' },
              ].map((tool) => (
                <Link
                  key={tool.label}
                  href={tool.href}
                  className="rounded-2xl bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-700 flex flex-col gap-1 hover:bg-white transition-colors"
                >
                  <span className="text-lg">{tool.icon}</span>
                  <span>{tool.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Calories 7 ngày gần nhất
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">
                Goal {calorieGoal.toLocaleString()} kcal
              </span>
            </div>
            {loadingWeekly ? (
              <div className="h-48 rounded-2xl bg-slate-50 animate-pulse" />
            ) : weeklyCalories.length === 0 ? (
              <p className="text-xs text-slate-400">
                Chưa có dữ liệu tuần này — hãy log vài bữa ăn để thấy biểu đồ nhé.
              </p>
            ) : (
              <WeeklyChart data={weeklyCalories} goal={calorieGoal} />
            )}
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <QuickRelog
              recentMeals={recentMeals}
              onRelog={async (meal) => {
                const res = await relogMeal(meal)
                if ((res as any)?.error) {
                  toast.error((res as any).error)
                  return
                }
                toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`)

                if (date === todayStr) {
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  const { data: meals } = await supabase.from('meal_logs')
                    .select('calories, protein, carbs, fat')
                    .eq('user_id', user.id)
                    .eq('logged_at', todayStr)
                  const t = (meals as any[] | null)?.reduce(
                    (acc, m) => ({
                      calories: acc.calories + m.calories,
                      protein: acc.protein + m.protein,
                      carbs: acc.carbs + m.carbs,
                      fat: acc.fat + m.fat,
                    }),
                    { calories: 0, protein: 0, carbs: 0, fat: 0 }
                  ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
                  setTotals(t)
                }
              }}
            />
          </div>

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

      {/* Habits + weekly + weight + monthly */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2.1fr)_minmax(0,2.1fr)]">
        <div className="space-y-4">
          <HabitCards
            key={`habits-${date}-${habits?.exercise_calories ?? 0}`}
            date={date}
            initialHabits={habits}
            onUpdate={() => loadHabits(date)}
          />
          <MonthlySummaryCard />
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Calories 7 ngày gần nhất
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">
                Goal {calorieGoal.toLocaleString()} kcal
              </span>
            </div>
            {loadingWeekly ? (
              <div className="h-48 rounded-2xl bg-slate-50 animate-pulse" />
            ) : weeklyCalories.length === 0 ? (
              <p className="text-xs text-slate-400">
                Chưa có dữ liệu tuần này — hãy log vài bữa ăn để thấy biểu đồ nhé.
              </p>
            ) : (
              <WeeklyChart data={weeklyCalories} goal={calorieGoal} />
            )}
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <QuickRelog
              recentMeals={recentMeals}
              onRelog={async (meal) => {
                const res = await relogMeal(meal)
                if ((res as any)?.error) {
                  toast.error((res as any).error)
                  return
                }
                toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`)

                if (date === todayStr) {
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  const { data: meals } = await supabase.from('meal_logs')
                    .select('calories, protein, carbs, fat')
                    .eq('user_id', user.id)
                    .eq('logged_at', todayStr)
                  const t = (meals as any[] | null)?.reduce(
                    (acc, m) => ({
                      calories: acc.calories + m.calories,
                      protein: acc.protein + m.protein,
                      carbs: acc.carbs + m.carbs,
                      fat: acc.fat + m.fat,
                    }),
                    { calories: 0, protein: 0, carbs: 0, fat: 0 }
                  ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
                  setTotals(t)
                }
              }}
            />
          </div>

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

      {/* Onboarding CTA */}
      {needsOnboarding && (
        <div className="glass-card rounded-[2rem] p-5 border-2 border-dashed border-emerald-200 bg-emerald-50/40 flex flex-col gap-3">
          <h3 className="text-sm font-black text-slate-800">
            Hoàn thiện hồ sơ để nhận plan AI cá nhân hóa 📝
          </h3>
          <p className="text-xs text-slate-500">
            Thêm tuổi, giới tính, chiều cao, cân nặng và mục tiêu để CalSnap tính toán calories và plan luyện tập phù hợp.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Tuổi</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Giới tính</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Chiều cao</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Cân nặng</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Mục tiêu</span>
          </div>
          <Link
            href="/onboarding"
            className="self-start mt-1 inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold"
          >
            Tạo plan với AI →
          </Link>
        </div>
      )}
    </div>
  )
}
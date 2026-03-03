// components/dashboard-page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HabitCards } from '@/components/habit-cards'
import { WeeklyReport } from '@/components/weekly-report'
import { WeightCheckin } from '@/components/weight-checkin'
import { MacroPill } from '@/components/macro-pill'
import type { Profile as DbProfile, FitnessPlan } from '@/lib/types'
import { WeeklyChart } from '@/components/weekly-chart'
import { QuickRelog } from '@/components/quick-relog'
import { getMealsForDate, getWeeklyCalories, relogMeal } from '@/app/actions/meals'
import { toast } from 'sonner'
import { MonthlySummaryCard } from '@/components/monthly-summary-card'
import { DailyTracker } from '@/components/daily-tracker'

interface MealSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [totals, setTotals] = useState<MealSummary | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number }[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(true)
  const [habits, setHabits] = useState<{
    steps: number
    water_ml: number
    exercise_minutes: number
    exercise_calories: number
  } | null>(null)
  const [exerciseCalories, setExerciseCalories] = useState(0)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: meals }, { data: habitsRow }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('meal_logs').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', date),
          supabase.from('daily_habits').select('steps, water_ml, exercise_minutes, exercise_calories').eq('user_id', user.id).eq('date', date).maybeSingle(),
        ])

      if (prof) setProfile(prof as DbProfile)

      const t = (meals as any[] | null)?.reduce(
        (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
      setTotals(t)

      const h = (habitsRow as any) ?? null
      setHabits(h)
      setExerciseCalories(h?.exercise_calories ?? 0)

      if (recentMeals.length === 0) {
        try { setRecentMeals((await getMealsForDate('recent') as any[]) ?? []) } catch { }
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    const loadWeekly = async () => {
      setLoadingWeekly(true)
      try { setWeeklyCalories((await getWeeklyCalories() as any[]) ?? []) } finally { setLoadingWeekly(false) }
    }
    loadWeekly()
  }, [])

  const plan = profile?.fitness_plan as FitnessPlan | null
  const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
  const calories = totals?.calories ?? 0
  const remaining = calorieGoal - calories
  const isOverGoal = calories > calorieGoal
  const estimatedBurnPerSession = Math.round((plan?.workout_duration_minutes ?? 45) * 7 * (profile?.weight_kg ?? 70) / 60)

  const today = new Date()
  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const headerDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const needsOnboarding = !profile?.height_cm || !profile?.age || !profile?.goal || !profile?.activity_level
  const todayStr = new Date().toISOString().split('T')[0]
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = profile?.full_name?.trim()?.split(' ')?.[0] ?? 'bạn'

  const ringSize = 220
  const ringStroke = 18
  const r = (ringSize - ringStroke * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0
  const dash = isOverGoal ? circ : (pct / 100) * circ

  const relogHandler = async (meal: any) => {
    const res = await relogMeal(meal)
    if ((res as any)?.error) { toast.error((res as any).error); return }
    toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`)
    if (date === todayStr) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: meals } = await supabase.from('meal_logs').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', todayStr)
      setTotals((meals as any[] | null)?.reduce((acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter pb-24">

      {/* ── SKELETON FALLBACK when profile not yet loaded ── */}
      {!profile && !totals && (
        <div className="space-y-4">
          <div className="h-72 rounded-[2rem] bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-[2rem] bg-slate-100 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 rounded-[2rem] bg-slate-100 animate-pulse" />
            <div className="h-48 rounded-[2rem] bg-slate-100 animate-pulse" />
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className={`nutri-header rounded-[2rem] overflow-hidden ${isOverGoal ? 'nutri-header-danger' : 'nutri-header'}`}>
        <div className="relative z-10 px-5 md:px-8 pt-12 pb-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-wide">{dateLabel}</p>
              <h1 className="text-white text-2xl md:text-3xl font-display font-extrabold mt-1">Xin chào, {firstName} 👋</h1>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl border border-white/25">🧑</div>
          </div>

          <div className="flex justify-center relative">
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="drop-shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
              <defs>
                <linearGradient id="nutriRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  {isOverGoal ? <><stop offset="0%" stopColor="#FF5252" /><stop offset="100%" stopColor="#FF1744" /></> : <><stop offset="0%" stopColor="#A8E063" /><stop offset="100%" stopColor="#5CB85C" /></>}
                </linearGradient>
              </defs>
              <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={ringStroke} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="url(#nutriRing)" strokeWidth={ringStroke} strokeLinecap="round"
                strokeDasharray={isOverGoal ? `${circ} 0` : `${dash} ${circ}`}
                strokeDashoffset={isOverGoal ? 0 : circ / 4}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-white font-display font-extrabold text-5xl leading-none tabular-nums">{Math.abs(remaining).toLocaleString()}</p>
              <p className="text-white/75 text-xs font-semibold mt-2">{remaining >= 0 ? 'kcal còn lại' : 'kcal vượt mục tiêu'}</p>
            </div>
          </div>

          <div className="flex justify-around mt-4">
            {[
              { icon: '🎯', val: calorieGoal.toLocaleString(), label: 'Mục tiêu' },
              { icon: '🍽️', val: calories.toLocaleString(), label: 'Đã ăn' },
              { icon: '🔥', val: `${exerciseCalories.toLocaleString()}/${estimatedBurnPerSession.toLocaleString()}`, label: 'Đã đốt' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg">{s.icon}</div>
                <div className="text-white font-display font-extrabold text-lg tabular-nums">{s.val}</div>
                <div className="text-white/65 text-[10px] font-semibold tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="w-full bg-white/15 rounded-2xl p-2 flex gap-1">
              {headerDays.map((d, idx) => {
                const dStr = d.toISOString().split('T')[0]
                const isActive = dStr === date
                const dayCalories = weeklyCalories.find((x) => x.date === dStr)?.calories ?? 0
                const dayPct = calorieGoal > 0 ? Math.round((dayCalories / calorieGoal) * 100) : 0
                return (
                  <button key={idx} type="button" onClick={() => setDate(dStr)}
                    className={`flex-1 rounded-xl px-1.5 py-2 transition-all text-center ${isActive ? 'bg-white' : 'bg-transparent hover:bg-white/10'}`}>
                    <div className={`text-[10px] font-semibold ${isActive ? 'text-[#2E7D32]' : 'text-white/80'}`}>{weekdayLabels[d.getDay()]}</div>
                    <div className={`w-7 h-7 rounded-full mx-auto mt-1 flex items-center justify-center text-[10px] font-bold ${dayPct > 100 ? (isActive ? 'bg-red-500 text-white' : 'bg-red-400 text-white')
                      : isActive ? 'bg-[#2E7D32] text-white' : 'bg-white/15 text-white'
                      }`}>{dayPct}%</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MACROS ── */}
      <div className="glass-card rounded-[2rem] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dinh dưỡng hôm nay</p>
          <span className="text-[11px] font-semibold text-slate-500">{date === todayStr ? 'Hôm nay' : date}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <MacroPill type="protein" value={totals?.protein ?? 0} />
          <MacroPill type="carbs" value={totals?.carbs ?? 0} />
          <MacroPill type="fat" value={totals?.fat ?? 0} />
        </div>
      </div>

      {/* ── GRID CHÍNH: HabitCards | AI + Chart + QuickRelog ── */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">

        {/* Cột trái: chỉ HabitCards — self-start để không bị kéo dài */}
        <div className="self-start">
          <HabitCards
            date={date}
            initialHabits={habits}
            onUpdate={(newCal) => { if (newCal !== undefined) setExerciseCalories(newCal) }}
          />
        </div>

        {/* Cột phải: AI + Chart + QuickRelog */}
        <div className="space-y-4">
          <div className="glass-card rounded-[2rem] p-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Trợ lý AI</p>
            <p className="text-sm font-black text-slate-800">Hỏi nhanh để log bữa ăn và tối ưu mục tiêu hôm nay.</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3 py-2">
              <span className="text-lg">✨</span>
              <p className="text-xs text-slate-500">Còn <span className="font-semibold text-slate-700">{Math.max(0, remaining).toLocaleString()} kcal</span> — hỏi AI gợi ý bữa tiếp theo.</p>
            </div>
            <Link href="/chat" className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold">Mở AI Assistant</Link>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: 'Chat', icon: '💬', href: '/chat' }, { label: 'Scan', icon: '📸', href: '/scan' }, { label: 'Log', icon: '📓', href: '/log' }].map((t) => (
                <Link key={t.label} href={t.href} className="rounded-2xl bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-700 flex flex-col gap-1 hover:bg-white transition-colors">
                  <span className="text-lg">{t.icon}</span><span>{t.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Calories 7 ngày</h3>
              <span className="text-[10px] text-slate-400 font-semibold">Goal {calorieGoal.toLocaleString()} kcal</span>
            </div>
            {loadingWeekly ? <div className="h-48 rounded-2xl bg-slate-50 animate-pulse" /> :
              weeklyCalories.length === 0 ? <p className="text-xs text-slate-400">Chưa có dữ liệu — hãy log vài bữa ăn nhé.</p> :
                <WeeklyChart data={weeklyCalories} goal={calorieGoal} />}
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <QuickRelog recentMeals={recentMeals} onRelog={relogHandler} />
          </div>
        </div>
      </div>

      {/* ── WATER & STEPS: full width ── */}
      <DailyTracker
        date={date}
        initialSteps={habits?.steps ?? 0}
        initialWaterMl={habits?.water_ml ?? 0}
      />

      {/* ── HÀNG PHỤ: Weight | Monthly ── */}
      {profile?.weight_kg && profile?.target_weight_kg ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          <WeightCheckin currentWeight={profile.weight_kg} targetWeight={profile.target_weight_kg} history={[]} />
          <MonthlySummaryCard />
        </div>
      ) : (
        <MonthlySummaryCard />
      )}

      {/* ── WEEKLY REPORT ── */}
      <WeeklyReport data={null} />

      {/* ── ONBOARDING CTA ── */}
      {needsOnboarding && (
        <div className="glass-card rounded-[2rem] p-5 border-2 border-dashed border-emerald-200 bg-emerald-50/40 flex flex-col gap-3">
          <h3 className="text-sm font-black text-slate-800">Hoàn thiện hồ sơ để nhận plan AI cá nhân hóa 📝</h3>
          <p className="text-xs text-slate-500">Thêm tuổi, giới tính, chiều cao, cân nặng và mục tiêu để CalSnap tính toán calories và plan luyện tập phù hợp.</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            {['Tuổi', 'Giới tính', 'Chiều cao', 'Cân nặng', 'Mục tiêu'].map((l) => (
              <span key={l} className="px-2 py-1 rounded-full bg-white/70 font-semibold">{l}</span>
            ))}
          </div>
          <Link href="/onboarding" className="self-start inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold">Tạo plan với AI →</Link>
        </div>
      )}
    </div>
  )
}
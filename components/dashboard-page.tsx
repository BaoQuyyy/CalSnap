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
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { getMealsForDate, getWeeklyCalories, relogMeal } from '@/app/actions/meals'
import { toast } from '@/components/toast'
import { MonthlySummaryCard } from '@/components/monthly-summary-card'

interface MealSummary { calories: number; protein: number; carbs: number; fat: number }

export default function DashboardPage() {
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [totals, setTotals] = useState<MealSummary | null>(null)
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number; label?: string }[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(true)
  const [habits, setHabits] = useState<{ steps: number; water_ml: number; exercise_minutes: number; exercise_calories: number } | null>(null)
  const [exerciseCalories, setExerciseCalories] = useState(0)
  const [habitRefreshKey, setHabitRefreshKey] = useState(0)
  const [ringSize, setRingSize] = useState(180)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Highlight logic for cross-page jumps
  useEffect(() => {
    const highlightId = searchParams.get('highlight')
    if (highlightId && profile && totals) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`meal-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          window.dispatchEvent(new CustomEvent('calsnap:meal-highlight', { detail: { mealId: highlightId } }))

          const params = new URLSearchParams(searchParams.toString())
          params.delete('highlight')
          router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, profile, totals, pathname, router])

  const todayStr = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: meals }, { data: habitsRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('meal_logs').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', date),
        supabase.from('daily_habits').select('steps, water_ml, exercise_minutes, exercise_calories').eq('user_id', user.id).eq('date', date).maybeSingle(),
      ])
      if (prof) setProfile(prof as DbProfile)
      const t = (meals as any[] | null)?.reduce(
        (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + (m.fat || 0) }),
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

  // React to AI water logging (so dashboard updates without refresh)
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { date?: string; water_ml?: number | null } | undefined
      const dStr = detail?.date
      if (!dStr) return

      // Only update when the currently selected date matches
      if (dStr !== date) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: habitsRow } = await supabase
        .from('daily_habits')
        .select('steps, water_ml, exercise_minutes, exercise_calories')
        .eq('user_id', user.id)
        .eq('date', dStr)
        .maybeSingle()

      setHabits((habitsRow as any) ?? null)
      setExerciseCalories((habitsRow as any)?.exercise_calories ?? 0)
      setHabitRefreshKey(k => k + 1)
    }

    window.addEventListener('calsnap:water-updated', handler as any)

    const habitHandler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { date?: string } | undefined
      if (detail?.date === date || !detail?.date) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: habitsRow } = await supabase
          .from('daily_habits')
          .select('steps, water_ml, exercise_minutes, exercise_calories')
          .eq('user_id', user.id)
          .eq('date', date)
          .maybeSingle()
        setHabits((habitsRow as any) ?? null)
        setExerciseCalories((habitsRow as any)?.exercise_calories ?? 0)
        setHabitRefreshKey(k => k + 1)
      }
    }

    const profileHandler = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof as DbProfile)
      setHabitRefreshKey(k => k + 1)
    }

    const mealHandler = async (e: Event) => {
      // Force refresh of everything for total consistency
      setTimeout(async () => {
        const detail = (e as CustomEvent).detail as { date?: string, mealId?: string } | undefined
        const targetDate = detail?.date || date

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch everything to ensure UI is in sync
        const [{ data: prof }, { data: meals }, { data: habitsRow }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('meal_logs').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', targetDate),
          supabase.from('daily_habits').select('steps, water_ml, exercise_minutes, exercise_calories').eq('user_id', user.id).eq('date', targetDate).maybeSingle(),
        ])

        if (prof) setProfile(prof as DbProfile)

        // Update totals if on the current date
        if (targetDate === date) {
          const t = (meals as any[] | null)?.reduce(
            (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + (m.fat || 0) }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
          setTotals(t)
          setHabits((habitsRow as any) ?? null)
          setExerciseCalories((habitsRow as any)?.exercise_calories ?? 0)
        }

        // Always refresh weekly chart to reflect changes
        const weeklyData = await getWeeklyCalories()
        if (weeklyData) setWeeklyCalories(weeklyData as any[])

        // Trigger internal refreshes
        setHabitRefreshKey(k => k + 1)
      }, 800) // Slightly longer delay to ensure all server side hooks finished
    }
    window.addEventListener('calsnap:meal-updated', mealHandler as any)
    window.addEventListener('calsnap:habit-updated', habitHandler as any)
    window.addEventListener('calsnap:profile-updated', profileHandler as any)

    return () => {
      window.removeEventListener('calsnap:water-updated', handler as any)
      window.removeEventListener('calsnap:meal-updated', mealHandler as any)
      window.removeEventListener('calsnap:habit-updated', habitHandler as any)
      window.removeEventListener('calsnap:profile-updated', profileHandler as any)
    }
  }, [date])

  const refreshTodayData = async (newExerciseCal?: number) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: meals } = await supabase.from('meal_logs').select('calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', todayStr)
    const t = (meals as any[] | null)?.reduce(
      (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + (m.fat || 0) }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    setTotals(t)
    if (newExerciseCal !== undefined) setExerciseCalories(newExerciseCal)
    setWeeklyCalories(prev => prev.map(d => d.date === todayStr ? { ...d, calories: t.calories } : d))
    setHabitRefreshKey(k => k + 1)
  }

  const plan = profile?.fitness_plan as FitnessPlan | null
  const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
  const calories = totals?.calories ?? 0
  const remaining = calorieGoal - calories
  const isOverGoal = calories > calorieGoal

  const today = new Date()
  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const headerDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d
  })

  const needsOnboarding = !profile?.height_cm || !profile?.age || !profile?.goal || !profile?.activity_level
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = profile?.full_name?.trim()?.split(' ')?.[0] ?? 'bạn'

  const RS = ringSize; const ST = RS < 160 ? 12 : 14
  const r = (RS - ST * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0
  const dash = isOverGoal ? circ : (pct / 100) * circ

  const relogHandler = async (meal: any) => {
    const res = await relogMeal(meal)
    if ((res as any)?.error) { toast.error((res as any).error); return }

    const newMealId = (res as any).data?.id
    toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`, {
      onClick: () => {
        if (newMealId) {
          router.push(`/log?highlight=${newMealId}`)
        }
      }
    })

    // Dispatch sync event so dashboard refreshes all metrics
    window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
      detail: { date: new Date().toISOString().split('T')[0], mealId: newMealId }
    }))

    if (date === todayStr) await refreshTodayData()
  }

  return (
    <div className="space-y-3 max-w-5xl mx-auto page-enter pb-40">

      {/* ── SKELETON ── */}
      {!profile && !totals && (
        <div className="space-y-3 animate-pulse">
          <div className="h-56 rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-80 rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-3">
              <div className="h-36 rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
              <div className="h-40 rounded-[2rem] bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          HEADER: Ring (trái) + Stats+Macros (phải) + Week strip
      ══════════════════════════════════════════════════ */}
      <div className={`ios-reveal nutri-header rounded-[2rem] overflow-hidden ${isOverGoal ? 'nutri-header-danger' : 'nutri-header'}`}>
        <div className="relative z-10 px-5 md:px-7 pt-7 pb-5">

          {/* Top: greeting + avatar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-[11px] font-bold tracking-wide uppercase">{dateLabel}</p>
              <h1 className="text-white text-2xl font-display font-black mt-1">Xin chào, {firstName} 👋</h1>
            </div>
            <Link href="/profile" className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg border border-white/25 transition-colors">🧑</Link>
          </div>

          {/* Ring + Right panel */}
          <div className="flex items-center gap-5">
            {/* SVG ring */}
            <div className="relative shrink-0">
              <svg width={RS} height={RS} viewBox={`0 0 ${RS} ${RS}`}>
                <defs>
                  <linearGradient id="nutriRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    {isOverGoal ? <><stop offset="0%" stopColor="#FF5252" /><stop offset="100%" stopColor="#FF1744" /></> : <><stop offset="0%" stopColor="#A8E063" /><stop offset="100%" stopColor="#56ab2f" /></>}
                  </linearGradient>
                </defs>
                <circle cx={RS / 2} cy={RS / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={ST} />
                <circle cx={RS / 2} cy={RS / 2} r={r} fill="none" stroke="url(#nutriRing)" strokeWidth={ST} strokeLinecap="round"
                  transform={`rotate(-90 ${RS / 2} ${RS / 2})`}
                  strokeDasharray={`${dash} ${circ}`}
                  strokeDashoffset={0} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-white font-display font-extrabold text-3xl leading-none tabular-nums">{Math.abs(remaining).toLocaleString()}</p>
                <p className="text-white/70 text-[10px] font-semibold mt-1">{remaining >= 0 ? 'kcal còn lại' : 'kcal vượt'}</p>
              </div>
            </div>

            {/* Right: 3 stats + macro pills */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-1 text-center">
                {[
                  { icon: '🎯', val: calorieGoal.toLocaleString(), label: 'Mục tiêu' },
                  { icon: '🍽️', val: calories.toLocaleString(), label: 'Đã ăn' },
                  { icon: '🔥', val: exerciseCalories.toLocaleString(), label: 'Đã đốt' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-sm">{s.icon}</div>
                    <div className="text-white font-black text-lg tabular-nums leading-tight">{s.val}</div>
                    <div className="text-white/75 text-[10px] font-bold tracking-wider uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <MacroPill type="protein" value={totals?.protein ?? 0} />
                <MacroPill type="carbs" value={totals?.carbs ?? 0} />
                <MacroPill type="fat" value={totals?.fat ?? 0} />
              </div>
            </div>
          </div>

          {/* Week day picker strip */}
          <div className="mt-4 bg-white/12 rounded-2xl p-1.5 flex gap-1">
            {headerDays.map((d, idx) => {
              const dStr = d.toISOString().split('T')[0]
              const isActive = dStr === date
              const dayCalories = weeklyCalories.find((x) => x.date === dStr)?.calories ?? 0
              const dayPct = calorieGoal > 0 ? Math.round((dayCalories / calorieGoal) * 100) : 0
              return (
                <button key={idx} type="button" onClick={() => setDate(dStr)}
                  className={`flex-1 rounded-xl px-1 py-1.5 text-center transition-all ${isActive ? 'bg-white' : 'hover:bg-white/10'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-700' : 'text-white/80'}`}>{weekdayLabels[d.getDay()]}</div>
                  <div className={`w-6 h-6 rounded-full mx-auto mt-0.5 flex items-center justify-center text-[9px] font-black ${dayPct > 100 ? (isActive ? 'bg-red-500 text-white' : 'bg-red-400/80 text-white')
                    : isActive ? 'bg-emerald-600 text-white' : dayPct > 0 ? 'bg-white/20 text-white' : 'bg-white/8 text-white/40'
                    }`}>{dayPct > 0 ? `${dayPct}%` : '-'}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── MIDDLE GRID (2 rows) ── */}
      <div className="grid gap-3">
        {/* Row 1: HabitCards + Chart (Matching heights) */}
        <div className="grid gap-3 md:grid-cols-2 items-stretch">
          <HabitCards className="h-full ios-reveal md:delay-75" date={date} initialHabits={habits} onUpdate={(newCal) => refreshTodayData(newCal)} />
          <div className="glass-card rounded-[2rem] p-5 h-full flex flex-col ios-reveal md:delay-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">Calories 7 ngày</h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-bold">Goal {calorieGoal.toLocaleString()} kcal</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {loadingWeekly
                ? <div className="h-44 rounded-2xl bg-slate-50 dark:bg-slate-800 animate-pulse" />
                : weeklyCalories.length === 0
                  ? <div className="h-44 flex items-center justify-center"><p className="text-xs text-slate-400 text-center">Chưa có dữ liệu — hãy log vài bữa ăn nhé.</p></div>
                  : <WeeklyChart data={weeklyCalories} goal={calorieGoal} />}
            </div>
          </div>
        </div>

        {/* Row 2: AI Assistant + QuickRelog (Matching heights) */}
        <div className="grid gap-3 md:grid-cols-2 items-stretch">
          <div className="glass-card rounded-[2rem] p-5 flex flex-col justify-between ios-reveal md:delay-200">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">Trợ lý AI</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Còn <span className="font-extrabold text-slate-800 dark:text-slate-100">{Math.max(0, remaining).toLocaleString()} kcal</span></span>
              </div>
              <Link href="/chat" className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl hoverboard-gradient text-white text-xs font-bold mb-3 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all">
                <span>✨</span> Mở AI Assistant
              </Link>
            </div>

            {/* AI Recommendation center bit for balance */}
            <div className="px-4 py-3 bg-emerald-50/60 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="animate-pulse">💡</span> AI Recommend:
                </p>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-300 dark:bg-emerald-600" />)}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic mb-3">
                {remaining > 500
                  ? "Bạn còn khá nhiều kcal, hãy ưu tiên bữa tối giàu Protein như ức gà hoặc cá hồi nhé!"
                  : remaining > 0
                    ? "Sắp đạt mục tiêu rồi! Hãy thử một bữa nhẹ với sữa chua Hy Lạp để giữ cơ bắp."
                    : "Bạn đã nạp đủ năng lượng hôm nay. Hãy uống thêm nước và nghỉ ngơi sớm nhé!"}
              </p>

              {/* Extra Health Insight to fill space */}
              <div className="pt-2.5 border-t border-emerald-100/50 dark:border-emerald-800/30">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1">💡 Daily Insight</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-200 leading-relaxed font-medium">
                  Việc đi bộ 10 phút sau bữa ăn giúp ổn định đường huyết và hỗ trợ tiêu hóa cực tốt đấy!
                </p>
              </div>
            </div>

            {/* Quick Tips or Stats to fill space */}
            <div className="px-4 mb-3 grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-[12px] font-black text-emerald-500 dark:text-emerald-400 tabular-nums">Perfect Day ✨</span>
              </div>
              <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-3">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Analysis</span>
                <span className="text-[12px] font-black text-blue-500 dark:text-blue-400 tabular-nums">Optimizing...</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[{ label: 'Chat', icon: '💬', href: '/chat' }, { label: 'Scan', icon: '📸', href: '/scan' }, { label: 'Log', icon: '📓', href: '/log' }].map((t) => (
                <Link key={t.label} href={t.href}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center gap-1.5 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95">
                  <span className="text-xl">{t.icon}</span><span>{t.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-5 ios-reveal md:delay-300">
            <QuickRelog recentMeals={recentMeals} onRelog={relogHandler} />
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Weight + Weekly Report (2-col grid for compaction) ── */}
      <div className="grid gap-3 md:grid-cols-2 items-start">
        <div className="space-y-3">
          {profile?.weight_kg && profile?.target_weight_kg && (
            <WeightCheckin currentWeight={profile.weight_kg} targetWeight={profile.target_weight_kg} history={[]} />
          )}
          <WeeklyReport data={null} />
        </div>
        <MonthlySummaryCard refreshKey={habitRefreshKey} />
      </div>

      {/* ── ONBOARDING CTA ── */}
      {needsOnboarding && (
        <div className="glass-card rounded-[2rem] p-5 border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 flex flex-col gap-3">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Hoàn thiện hồ sơ để nhận plan AI cá nhân hóa 📝</h3>
          <p className="text-xs text-slate-500">Thêm tuổi, chiều cao, cân nặng và mục tiêu.</p>
          <Link href="/onboarding" className="self-start inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold">
            Tạo plan với AI →
          </Link>
        </div>
      )}
    </div>
  )
}
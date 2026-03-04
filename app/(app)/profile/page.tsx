// app/(app)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { User, Target, LogOut, ClipboardList, Scale, TrendingDown, TrendingUp, Edit3 } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [totalMeals, setTotalMeals] = useState(0)
  const [daysTracked, setDaysTracked] = useState(0)
  const [avgCalories, setAvgCalories] = useState(0)
  const [profile, setProfile] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [journeyStreak, setJourneyStreak] = useState(0)
  const [journeyScore, setJourneyScore] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User')

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (prof) {
        setProfile(prof)
        setJourneyStreak(prof.journey_streak ?? 0)
        setJourneyScore(prof.journey_score ?? 0)
      }

      const { data: meals } = await supabase
        .from('meal_logs').select('logged_at, calories').eq('user_id', user.id)

      if (meals && meals.length > 0) {
        const dates = new Set((meals as any[]).map((m) => m.logged_at))
        const total = (meals as any[]).reduce((s, m) => s + m.calories, 0)
        setTotalMeals(meals.length)
        setDaysTracked(dates.size)
        setAvgCalories(Math.round(total / dates.size))
      }

      const { data: weights } = await supabase
        .from('weight_checkins').select('*').eq('user_id', user.id)
        .order('date', { ascending: true }).limit(8)

      setWeightHistory(weights ?? [])
      setLoading(false)
    })
  }, [])

  const plan = profile?.fitness_plan as any
  const weightDiff = profile?.weight_kg && profile?.target_weight_kg
    ? Math.abs(profile.weight_kg - profile.target_weight_kg) : null

  return (
    <div className="space-y-5 max-w-lg mx-auto page-enter pb-24">

      {/* Header */}
      <div className="-mx-4 md:-mx-8 nutri-header">
        <div className="relative z-10 px-5 md:px-8 pt-12 pb-7 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-display font-extrabold shrink-0 border border-white/25">
            {(name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-extrabold text-white truncate">{name}</h2>
            <p className="text-white/75 text-sm truncate">{email}</p>
            {plan && (
              <span className="inline-block mt-1 px-3 py-0.5 bg-white/15 text-white text-xs font-semibold rounded-full border border-white/15">
                {plan.bmi_category} · BMI {plan.bmi}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bữa ăn', value: totalMeals, icon: '🍽️' },
          { label: 'Ngày track', value: daysTracked, icon: '📅' },
          { label: 'TB kcal', value: avgCalories || '—', icon: '🔥' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="glass-card rounded-[2rem] p-4 text-center">
            <p className="text-lg mb-0.5">{icon}</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Personal info prompt if missing core fields */}
      {(!profile?.height_cm || !profile?.age) && (
        <div className="glass-card rounded-[2rem] p-5 border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-900/10">
          <h3 className="text-sm font-black text-slate-800 mb-1">Hoàn thiện hồ sơ 📝</h3>
          <p className="text-xs text-slate-500 mb-3">
            Thêm tuổi, chiều cao và giới tính để AI tạo plan chính xác hơn cho bạn.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mb-3">
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Tuổi</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Giới tính</span>
            <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">Chiều cao</span>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl hoverboard-gradient text-white text-xs font-bold"
          >
            Cập nhật ngay →
          </Link>
        </div>
      )}

      {/* Journey */}
      {(journeyStreak > 0 || journeyScore > 0) && (
        <div className="glass-card rounded-[2rem] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Hành Trình</h3>
          <div className="flex gap-3">
            <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-orange-500">🔥 {journeyStreak}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">ngày streak</p>
            </div>
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{journeyScore}%</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">tuần này</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan summary */}
      {plan && (
        <div className="glass-card rounded-[2rem] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Plan</h3>
            <Link href="/fitness-plan" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              <ClipboardList size={12} /> Xem đầy đủ
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Calories', value: `${plan.daily_calories} kcal`, icon: '🔥' },
              { label: 'Protein', value: `${plan.daily_protein_g}g`, icon: '💪' },
              { label: 'Workouts', value: `${plan.weekly_workouts}x/tuần`, icon: '🏋️' },
              { label: 'Mục tiêu', value: profile.goal === 'lose_weight' ? 'Giảm cân' : profile.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì', icon: '🎯' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{label}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/onboarding"
            className="mt-3 w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors">
            <Edit3 size={12} /> Cập nhật thông tin cá nhân
          </Link>
        </div>
      )}

      {/* Calorie goal — read-only from plan (per NutriAI spec) */}
      <div className="glass-card rounded-[2rem] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            Mục tiêu calo
          </h3>
          <Link
            href="/onboarding"
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            Tính lại với AI
          </Link>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-display font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {plan?.daily_calories?.toLocaleString?.() ?? '—'}
              <span className="text-base font-semibold text-slate-400 dark:text-slate-500 ml-1">
                kcal
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Lấy từ AI fitness plan (không chỉnh tay tại đây).
            </p>
          </div>
        </div>
      </div>

      {/* Weight history */}
      {profile?.weight_kg && profile?.target_weight_kg && (
        <div className="glass-card rounded-[2rem] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cân nặng</h3>
            <Scale size={16} className="text-slate-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{profile.weight_kg}<span className="text-base font-semibold text-slate-400 dark:text-slate-500">kg</span></p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">hiện tại</p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl ${profile.weight_kg > profile.target_weight_kg ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
              {profile.weight_kg > profile.target_weight_kg ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span className="text-sm font-black">{weightDiff?.toFixed(1)}kg</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{profile.target_weight_kg}<span className="text-base font-semibold text-slate-400 dark:text-slate-500">kg</span></p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">mục tiêu</p>
            </div>
          </div>
          {weightHistory.length > 1 && (
            <div className="flex items-end gap-1 h-12 mt-3">
              {weightHistory.map((w, i) => {
                const max = Math.max(...weightHistory.map((x: any) => x.weight_kg))
                const min = Math.min(...weightHistory.map((x: any) => x.weight_kg))
                const range = max - min || 1
                const h = Math.max(15, ((w.weight_kg - min) / range) * 100)
                return <div key={i} className="flex-1 bg-emerald-200 rounded-t-lg" style={{ height: `${h}%` }} />
              })}
            </div>
          )}
          {weightHistory.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Chưa có lịch sử — check-in từ dashboard!</p>
          )}
        </div>
      )}

      {/* Account */}
      <div className="glass-card rounded-[2rem] p-5 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-emerald-500" /> Tài khoản
        </h3>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{loading ? '...' : email}</p>
        <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">Đã kết nối</span>
        <Link
          href="/safety"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 mt-2"
        >
          Tìm hiểu về giới hạn & an toàn →
        </Link>
      </div>

      {/* Logout */}
      <form action={logout}>
        <Button type="submit" variant="outline"
          className="w-full gap-2 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3.5">
          <LogOut className="h-4 w-4" /> Đăng xuất
        </Button>
      </form>
    </div>
  )
}

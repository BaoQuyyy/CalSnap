// app/(app)/fitness-plan/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Droplets, Dumbbell, Clock, Target, CheckCircle2, TrendingDown, AlertTriangle, Flame } from 'lucide-react'

function getBmiColor(cat: string) {
  const map: Record<string, string> = {
    Underweight: 'text-blue-500 bg-blue-50',
    Normal: 'text-emerald-500 bg-emerald-50',
    Overweight: 'text-orange-500 bg-orange-50',
    Obese: 'text-red-500 bg-red-50',
  }
  return map[cat] ?? 'text-slate-500 bg-slate-50'
}

function getGoalLabel(goal: string) {
  const map: Record<string, string> = {
    lose_weight: '🔥 Lose Weight',
    maintain: '⚖️ Maintain',
    gain_muscle: '💪 Gain Muscle',
  }
  return map[goal] ?? goal
}

function MacroBar({ label, actual, goal, unit, color }: {
  label: string; actual: number; goal: number; unit: string; color: string
}) {
  const pct = goal > 0 ? Math.min(140, Math.round((actual / goal) * 100)) : 0
  const over = actual > goal * 1.1
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <span className={`text-xs font-bold ${over ? 'text-red-500' : 'text-slate-500'}`}>
          {Math.round(actual)}{unit} / {goal}{unit} {over ? '⚠️' : ''}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : color}`}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export default async function FitnessPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.fitness_plan) redirect('/onboarding')

  const plan = profile.fitness_plan as any
  const today = new Date().toISOString().split('T')[0]

  const { data: todayMeals } = await supabase
    .from('meal_logs').select('calories, protein, carbs, fat')
    .eq('user_id', user.id).eq('logged_at', today)

  const actual = {
    calories: todayMeals?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0,
    protein: Math.round(todayMeals?.reduce((s, m) => s + (m.protein ?? 0), 0) ?? 0),
    carbs: Math.round(todayMeals?.reduce((s, m) => s + (m.carbs ?? 0), 0) ?? 0),
    fat: Math.round(todayMeals?.reduce((s, m) => s + (m.fat ?? 0), 0) ?? 0),
  }

  const caloriesLeft = plan.daily_calories - actual.calories
  const caloriesPct = Math.min(100, Math.round((actual.calories / plan.daily_calories) * 100))
  const isOverCalories = actual.calories > plan.daily_calories * 1.1
  const isUnderCalories = actual.calories < plan.daily_calories * 0.5 && actual.calories > 0

  const userName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'User'
  const total = (plan.daily_protein_g ?? 0) + (plan.daily_carbs_g ?? 0) + (plan.daily_fat_g ?? 0)
  const proteinPct = total ? Math.round((plan.daily_protein_g / total) * 100) : 33
  const carbsPct = total ? Math.round((plan.daily_carbs_g / total) * 100) : 34
  const fatPct = total ? Math.round((plan.daily_fat_g / total) * 100) : 33
  const weightDiff = Math.abs((profile.weight_kg ?? 0) - (profile.target_weight_kg ?? 0))

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-4 lg:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm w-fit">
          <ChevronLeft size={18} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="hoverboard-card rounded-[3rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-50 text-sm font-medium mb-1">Your Fitness Plan 🎯</p>
            <h1 className="text-3xl font-black mb-4">{userName}&apos;s Plan</h1>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-2xl text-sm font-bold">
                {getGoalLabel(profile.goal ?? '')}
              </span>
              <span className={`px-4 py-1.5 rounded-2xl text-sm font-bold ${getBmiColor(plan.bmi_category)}`}>
                BMI {plan.bmi} · {plan.bmi_category}
              </span>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* TODAY */}
        <div className={`glass-card rounded-[2.5rem] p-6 ${isOverCalories ? 'border-2 border-red-200' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hôm nay</h2>
            {isOverCalories && (
              <span className="flex items-center gap-1 text-xs font-black text-red-500 bg-red-50 px-3 py-1 rounded-full">
                <AlertTriangle size={12} /> Vượt mức!
              </span>
            )}
            {isUnderCalories && (
              <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                Còn thiếu nhiều
              </span>
            )}
          </div>

          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-4xl font-black ${isOverCalories ? 'text-red-500' : 'text-slate-800'}`}>
                  {actual.calories.toLocaleString()}
                </span>
                <span className="text-slate-400 font-semibold text-sm">/ {plan.daily_calories.toLocaleString()} kcal</span>
              </div>
              <p className={`text-sm font-semibold mt-0.5 ${isOverCalories ? 'text-red-500' : actual.calories === 0 ? 'text-slate-400' : 'text-emerald-500'}`}>
                {isOverCalories ? `⚠️ Dư ${Math.abs(caloriesLeft)} kcal`
                  : actual.calories === 0 ? 'Chưa log bữa nào hôm nay'
                  : `Còn ${caloriesLeft} kcal`}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOverCalories ? 'bg-red-100' : 'bg-orange-100'}`}>
              <Flame size={22} className={isOverCalories ? 'text-red-500' : 'text-orange-500'} />
            </div>
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div className={`h-full rounded-full transition-all duration-500 ${isOverCalories ? 'bg-red-400' : 'hoverboard-gradient'}`}
              style={{ width: `${caloriesPct}%` }} />
          </div>

          <div className="flex flex-col gap-3">
            <MacroBar label="Protein" actual={actual.protein} goal={plan.daily_protein_g} unit="g" color="bg-emerald-400" />
            <MacroBar label="Carbs" actual={actual.carbs} goal={plan.daily_carbs_g} unit="g" color="bg-orange-400" />
            <MacroBar label="Fat" actual={actual.fat} goal={plan.daily_fat_g} unit="g" color="bg-blue-400" />
          </div>

          {isOverCalories && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm font-semibold text-red-700">
                ⚠️ Bạn đã vượt {Math.abs(caloriesLeft)} kcal so với plan. Thử đi bộ 30–45 phút hoặc giảm bữa tối.
              </p>
            </div>
          )}
          <Link href="/log" className="mt-4 block text-center text-xs font-bold text-emerald-600 hover:underline">
            Xem chi tiết bữa ăn →
          </Link>
        </div>

        {/* Daily Nutrition TARGET — FIX số calories dùng text-emerald-600 thay bg-clip-text */}
        <div className="glass-card rounded-[2.5rem] p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Mục tiêu dinh dưỡng / ngày</h2>
          <div className="text-center mb-6">
            {/* FIX: bỏ hoverboard-gradient bg-clip-text text-transparent — dùng text solid */}
            <p className="text-5xl font-black text-emerald-600">
              {plan.daily_calories?.toLocaleString()}
            </p>
            <p className="text-slate-400 font-semibold mt-1">kcal / day</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Protein', g: plan.daily_protein_g, pct: proteinPct, color: 'text-emerald-600' },
              { label: 'Carbs', g: plan.daily_carbs_g, pct: carbsPct, color: 'text-orange-600' },
              { label: 'Fat', g: plan.daily_fat_g, pct: fatPct, color: 'text-blue-600' },
            ].map(({ label, g, pct, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                      strokeLinecap="round" className={color} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${color}`}>{pct}%</span>
                </div>
                <p className="font-black text-slate-800">{Math.round(g)}g</p>
                <p className="text-[10px] font-bold text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
            <Droplets className="text-blue-500 shrink-0" size={20} />
            <div>
              <p className="font-bold text-slate-800 text-sm">{plan.water_liters}L water / day</p>
              <p className="text-xs text-slate-400">{Array.from({ length: Math.round(plan.water_liters / 0.25) }, (_, i) => <span key={i}>💧</span>)}</p>
            </div>
          </div>
        </div>

        {/* Workout */}
        <div className="glass-card rounded-[2.5rem] p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Workout Plan</h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: <Dumbbell size={18} className="text-emerald-600" />, bg: 'bg-emerald-100', value: `${plan.weekly_workouts}x`, label: 'per week' },
              { icon: <Clock size={18} className="text-orange-600" />, bg: 'bg-orange-100', value: `${plan.workout_duration_minutes}min`, label: 'per session' },
            ].map(({ icon, bg, value, label }) => (
              <div key={label} className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
                <div><p className="font-black text-slate-800 text-lg">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {plan.workout_types?.map((t: string) => (
              <span key={t} className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-2xl text-sm font-bold">{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl">
            <Target className="text-purple-500 shrink-0" size={20} />
            <p className="font-semibold text-slate-700 text-sm">
              Estimated <span className="font-black text-purple-600">{plan.estimated_weeks_to_goal} weeks</span> to reach your goal
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card rounded-[2.5rem] p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Personalized Tips</h2>
          <div className="flex flex-col gap-3">
            {plan.tips?.map((tip: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-slate-700">{tip}</p>
              </div>
            ))}
          </div>
          {plan.summary && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-sm font-medium text-emerald-800">{plan.summary}</p>
            </div>
          )}
        </div>

        {/* Weight Progress — FIX: badge diff nằm dưới thanh, không chen giữa 2 số */}
        {profile.weight_kg && profile.target_weight_kg && (
          <div className="hoverboard-card rounded-[2.5rem] p-7 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-5">Progress Estimate</h2>
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <p className="text-3xl font-black">{profile.weight_kg}kg</p>
                  <p className="text-emerald-200 text-xs mt-1">Hiện tại</p>
                </div>
                <TrendingDown size={26} className="text-emerald-300" />
                <div className="text-center">
                  <p className="text-3xl font-black">{profile.target_weight_kg}kg</p>
                  <p className="text-emerald-200 text-xs mt-1">Mục tiêu</p>
                </div>
              </div>
              {/* Thanh progress */}
              <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-white rounded-full w-[5%]" />
              </div>
              {/* FIX: badge nằm dưới thanh */}
              <p className="text-center text-xs font-black text-emerald-200">
                {weightDiff}kg to go
              </p>
            </div>
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Calorie Goal — FIX: hiện từ plan, không cho tự nhập */}
        <div className="glass-card rounded-[2.5rem] p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">🎯 Calorie Goal</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-slate-800">{plan.daily_calories?.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">kcal / ngày · từ AI fitness plan</p>
            </div>
            <Link href="/onboarding"
              className="px-5 py-3 rounded-2xl hoverboard-gradient text-white text-sm font-bold hover:opacity-90 transition-opacity">
              Cập nhật Plan
            </Link>
          </div>
        </div>

        <Link href="/onboarding"
          className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-center hover:bg-slate-200 transition-colors block">
          🔄 Recalculate Plan
        </Link>
        <div className="h-8" />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
  Sparkles,
} from 'lucide-react'

interface NutritionStatus {
  calories_goal: number
  calories_actual: number
  protein_goal: number
  protein_actual: number
  carbs_goal: number
  carbs_actual: number
  fat_goal: number
  fat_actual: number
  adherence_score: number
  is_on_track: boolean
}

function getDiff(actual: number, goal: number) {
  const diff = actual - goal
  const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0
  return { diff, pct, over: diff > 0, under: diff < 0 }
}

function generateAdvice(status: NutritionStatus): {
  advice: string
  suggestions: string[]
} {
  const tips: string[] = []
  const suggestions: string[] = []
  const cal = getDiff(status.calories_actual, status.calories_goal)
  const protein = getDiff(status.protein_actual, status.protein_goal)
  const carbs = getDiff(status.carbs_actual, status.carbs_goal)
  const fat = getDiff(status.fat_actual, status.fat_goal)

  if (cal.over && cal.diff > 200)
    tips.push(`⚠️ Dư ${cal.diff} kcal — thử đi bộ 30 phút để bù lại`)
  if (cal.under && Math.abs(cal.diff) > 300) {
    tips.push(`📉 Còn thiếu ${Math.abs(cal.diff)} kcal — ăn thêm bữa nhẹ`)
    suggestions.push(`🍌 Chuối + bơ đậu phộng (~300 kcal)`)
    suggestions.push(`🥛 Sữa chua Hy Lạp + granola (~250 kcal)`)
  }
  if (protein.under && protein.pct < 70) {
    tips.push(`💪 Protein chỉ ${protein.pct}% mục tiêu`)
    suggestions.push(`🥚 3 quả trứng luộc (+18g protein)`)
    suggestions.push(`🍗 Ức gà 150g (~35g protein)`)
    suggestions.push(`🥜 Đậu phụ 200g (~16g protein)`)
  }
  if (fat.over && fat.pct > 130)
    tips.push(`🧈 Chất béo dư ${fat.diff}g — hạn chế đồ chiên`)
  if (carbs.over && carbs.pct > 130)
    tips.push(`🍚 Tinh bột dư ${carbs.diff}g — bữa tối ưu tiên rau + protein`)
  if (status.is_on_track && tips.length === 0)
    tips.push(`✅ Hôm nay đang đúng plan! Tuyệt vời!`)
  if (tips.length === 0)
    tips.push(`👍 Dinh dưỡng khá cân bằng, duy trì nhé!`)

  return { advice: tips.join(' · '), suggestions }
}

export function NutritionAlert({ status }: { status: NutritionStatus }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const { advice, suggestions } = generateAdvice(status)

  return (
    <div
      className={`rounded-[2rem] p-5 border relative ${
        status.is_on_track
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-orange-50 border-orange-200'
      }`}
    >
      <button
        onClick={() => setVisible(false)}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-3 mb-4">
        {status.is_on_track ? (
          <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
        ) : (
          <AlertTriangle className="text-orange-500 shrink-0" size={20} />
        )}
        <div>
          <p className="font-black text-slate-800 text-sm">
            {status.is_on_track
              ? 'Đang đúng plan hôm nay 🎯'
              : 'Cần điều chỉnh ⚡'}
          </p>
          <p className="text-xs text-slate-500">
            Điểm: {status.adherence_score}/100
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {[
          {
            label: 'Calories',
            actual: status.calories_actual,
            goal: status.calories_goal,
            unit: 'kcal',
            color: 'bg-purple-400',
          },
          {
            label: 'Protein',
            actual: status.protein_actual,
            goal: status.protein_goal,
            unit: 'g',
            color: 'bg-emerald-400',
          },
          {
            label: 'Carbs',
            actual: status.carbs_actual,
            goal: status.carbs_goal,
            unit: 'g',
            color: 'bg-orange-400',
          },
          {
            label: 'Fat',
            actual: status.fat_actual,
            goal: status.fat_goal,
            unit: 'g',
            color: 'bg-blue-400',
          },
        ].map(({ label, actual, goal, unit, color }) => {
          const pct = goal > 0 ? Math.min(130, Math.round((actual / goal) * 100)) : 0
          const over = actual > goal * 1.1
          return (
            <div key={label}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[11px] font-semibold text-slate-600">
                  {label}
                </span>
                <span
                  className={`text-[11px] font-bold flex items-center gap-0.5 ${
                    over ? 'text-orange-500' : 'text-slate-500'
                  }`}
                >
                  {over ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {actual}
                  {unit} / {goal}
                  {unit}
                </span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct > 110 ? 'bg-orange-400' : color
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-700 font-medium mb-2">{advice}</p>

      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
            <Sparkles size={10} /> Gợi ý bổ sung
          </p>
          <div className="flex flex-col gap-1">
            {suggestions.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-white/70 rounded-xl px-3 py-1.5 text-slate-700 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


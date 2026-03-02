'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react'

interface WeeklyHistoryItem {
  date: string
  adherence_score: number
  is_on_track: boolean
}

interface WeeklyReportData {
  onTrackDays: number
  avgScore: number
  avgCalories: number
  avgProtein: number
  caloriesGoal: number
  proteinGoal: number
  weakPoints: string[]
  history: WeeklyHistoryItem[]
}

interface WeeklyReportProps {
  data: WeeklyReportData | null
}

export function WeeklyReport({ data }: WeeklyReportProps) {
  const [open, setOpen] = useState(false)
  if (!data) return null

  const calPct = data.caloriesGoal
    ? Math.round((data.avgCalories / data.caloriesGoal) * 100)
    : 0
  const proteinPct = data.proteinGoal
    ? Math.round((data.avgProtein / data.proteinGoal) * 100)
    : 0

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <Calendar size={16} className="text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-black text-slate-800 text-sm">Báo cáo tuần này</p>
            <p className="text-xs text-slate-400">
              {data.onTrackDays}/7 ngày đúng plan · TB {data.avgScore}/100
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-slate-800">{data.avgCalories}</p>
              <p className="text-[10px] text-slate-400">TB kcal/ngày</p>
              <span
                className={`text-[10px] font-bold flex items-center justify-center gap-0.5 mt-0.5 ${
                  calPct > 110
                    ? 'text-orange-500'
                    : calPct < 90
                    ? 'text-blue-500'
                    : 'text-emerald-500'
                }`}
              >
                {calPct > 100 ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}{' '}
                {calPct}% goal
              </span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-slate-800">{data.avgProtein}g</p>
              <p className="text-[10px] text-slate-400">TB protein/ngày</p>
              <span
                className={`text-[10px] font-bold flex items-center justify-center gap-0.5 mt-0.5 ${
                  proteinPct < 80 ? 'text-orange-500' : 'text-emerald-500'
                }`}
              >
                {proteinPct > 100 ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}{' '}
                {proteinPct}% goal
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1 h-16 mb-3">
            {data.history.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(d.adherence_score / 100) * 48}px`,
                    background: d.is_on_track
                      ? 'linear-gradient(135deg, #10b981, #34d399)'
                      : '#fcd34d',
                  }}
                />
              </div>
            ))}
          </div>

          {data.weakPoints.length > 0 && (
            <div className="bg-orange-50 rounded-2xl p-3">
              <p className="text-xs font-black text-orange-700 mb-1">
                ⚡ Cần cải thiện tuần sau:
              </p>
              {data.weakPoints.map((w, i) => (
                <p key={i} className="text-xs text-orange-600">
                  • {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


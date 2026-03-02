'use client'

import { Flame } from 'lucide-react'

interface JourneyProgressProps {
  journeyScore: number
  streak: number
  onTrackDays: number
  history: Array<{ date: string; is_on_track: boolean; adherence_score: number }>
}

function getMilestone(score: number) {
  if (score >= 90) return { label: 'Champion 🏆', color: 'text-yellow-500', next: 100 }
  if (score >= 70) return { label: 'On Fire 🔥', color: 'text-orange-500', next: 90 }
  if (score >= 50) return { label: 'Progressing 💪', color: 'text-emerald-500', next: 70 }
  if (score >= 30) return { label: 'Getting There 🌱', color: 'text-blue-500', next: 50 }
  return { label: 'Just Started 🚀', color: 'text-slate-500', next: 30 }
}

export function JourneyProgress({
  journeyScore,
  streak,
  onTrackDays,
  history,
}: JourneyProgressProps) {
  const milestone = getMilestone(journeyScore)
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div className="glass-card rounded-[2rem] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Hành Trình
        </h3>
        <span className={`text-xs font-black ${milestone.color}`}>
          {milestone.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-2xl font-black text-slate-800">
            {journeyScore}%
          </span>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame size={14} fill="currentColor" />
            <span className="text-sm font-black">{streak} ngày</span>
          </div>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full hoverboard-gradient rounded-full transition-all duration-700 relative"
            style={{ width: `${journeyScore}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-emerald-400" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Còn {Math.max(0, milestone.next - journeyScore)}% lên mốc tiếp theo
        </p>
      </div>

      <div className="flex justify-between mt-3">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - 6 + i)
          const dateStr = d.toISOString().split('T')[0]
          const dayData = history.find((h) => h.date === dateStr)
          const isToday = i === 6
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                  dayData?.is_on_track
                    ? 'hoverboard-gradient text-white shadow-sm'
                    : dayData
                    ? 'bg-orange-100 text-orange-500'
                    : isToday
                    ? 'bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300'
                    : 'bg-slate-100 text-slate-300'
                }`}
              >
                {dayData?.is_on_track ? '✓' : dayData ? '~' : isToday ? '?' : '·'}
              </div>
              <span
                className={`text-[9px] font-bold ${
                  isToday ? 'text-emerald-500' : 'text-slate-400'
                }`}
              >
                {days[d.getDay() === 0 ? 6 : d.getDay() - 1]}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 mt-3">
        <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-base font-black text-slate-800">{onTrackDays}/7</p>
          <p className="text-[9px] text-slate-400 font-semibold">ngày đúng plan</p>
        </div>
        <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-base font-black text-slate-800">{streak}</p>
          <p className="text-[9px] text-slate-400 font-semibold">streak</p>
        </div>
        <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 text-center">
          <p className="text-base font-black text-emerald-600">{journeyScore}%</p>
          <p className="text-[9px] text-emerald-500 font-semibold">tuần này</p>
        </div>
      </div>
    </div>
  )
}


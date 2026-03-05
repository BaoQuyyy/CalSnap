'use client'

import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { addWater } from '@/app/actions/water'

interface WaterTrackerProps {
  currentMl: number
  goalMl: number
}

export function WaterTracker({ currentMl: initial, goalMl }: WaterTrackerProps) {
  const [current, setCurrent] = useState(initial)
  const [loading, setLoading] = useState(false)

  const pct = goalMl > 0 ? Math.min(100, Math.round((current / goalMl) * 100)) : 0
  const cups = Math.round(current / 250)

  const handleAdd = async (ml: number) => {
    setLoading(true)
    const result = await addWater(ml)
    if ('total' in result) {
      setCurrent(result.total)
    }
    setLoading(false)
  }

  return (
    <div className="glass-card rounded-[2rem] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Nước uống hôm nay
        </h3>
        <span className="text-xs font-black text-blue-500">
          {(current / 1000).toFixed(1)}L / {goalMl / 1000}L
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="h-3 bg-blue-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mb-4">
        {cups} ly · {pct}% mục tiêu {pct >= 100 ? '🎉' : ''}
      </p>

      {/* Droplet row */}
      <div className="flex gap-1 flex-wrap mb-4">
        {Array.from({ length: Math.round(goalMl / 250) }, (_, i) => (
          <Droplets
            key={i}
            size={18}
            className={i < cups ? 'text-blue-400' : 'text-slate-200'}
            fill="currentColor"
          />
        ))}
      </div>

      {/* Interactive quick-add buttons with playful animation */}
      <div className="flex gap-2">
        {[100, 200, 300, 500].map((ml) => (
          <button
            key={ml}
            onClick={() => handleAdd(ml)}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-black hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
          >
            +{ml}ml
          </button>
        ))}
      </div>
    </div>
  )
}


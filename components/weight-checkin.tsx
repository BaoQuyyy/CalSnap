// components/weight-checkin.tsx
'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp, Plus, X } from 'lucide-react'
import { addWeightCheckin } from '@/app/actions/weight'
import { toast } from 'sonner'

interface WeightHistoryItem {
  date: string
  weight_kg: number
}

interface WeightCheckinProps {
  currentWeight: number
  targetWeight: number
  history: WeightHistoryItem[]
}

export function WeightCheckin({
  currentWeight: initial,
  targetWeight,
  history,
}: WeightCheckinProps) {
  const [current, setCurrent] = useState(initial)
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(false)

  const diff = current - targetWeight
  const isLosing = diff > 0

  const weeksLeft = Math.abs(diff) / 0.5
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + Math.round(weeksLeft * 7))

  const handleSave = async () => {
    const kg = parseFloat(input)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    setLoading(true)
    const res = await addWeightCheckin(kg)
    if ((res as any)?.error) {
      toast.error((res as any).error)
    } else {
      setCurrent(kg)
      setInput('')
      setShowInput(false)
      toast.success(`✅ Đã cập nhật cân nặng: ${kg}kg — plan dinh dưỡng đã được tính lại!`)
      // Dispatch sync event instead of hard reload
      window.dispatchEvent(new CustomEvent('calsnap:profile-updated', { detail: { weight: kg } }))
    }
    setLoading(false)
  }

  const recentHistory = history.slice(-8)
  const max = recentHistory.length > 0 ? Math.max(...recentHistory.map((x) => x.weight_kg)) : current
  const min = recentHistory.length > 0 ? Math.min(...recentHistory.map((x) => x.weight_kg)) : current
  const range = max - min || 1

  return (
    <div className="glass-card rounded-[2rem] p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Theo dõi cân nặng
        </h3>
        <button
          onClick={() => setShowInput((v) => !v)}
          className="w-8 h-8 rounded-xl hoverboard-gradient flex items-center justify-center text-white"
        >
          {showInput ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* 2 số to 2 bên */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-4xl font-black text-slate-800">
            {current}<span className="text-lg font-semibold text-slate-400">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">hiện tại</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-emerald-600">
            {targetWeight}<span className="text-lg font-semibold text-slate-400">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">mục tiêu</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full hoverboard-gradient rounded-full transition-all"
          style={{
            width: `${Math.max(5, Math.min(95, 100 - (Math.abs(diff) / (Math.abs(diff) + 1)) * 100))}%`,
          }}
        />
      </div>

      {/* Badge + thời gian */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-2xl ${isLosing ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
          {isLosing ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          <span className="text-xs font-black">
            {Math.abs(diff).toFixed(1)}kg {isLosing ? 'cần giảm' : 'cần tăng'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          ~{Math.round(weeksLeft)} tuần nữa ·{' '}
          {targetDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Mini chart with Labels */}
      {recentHistory.length > 0 && (
        <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-800/50">
          <div className="flex items-end gap-1.5 h-20 mb-1">
            {recentHistory.map((h, i) => {
              const pct = ((h.weight_kg - min) / range) * 100
              const dayStr = new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-emerald-600 mb-1">
                    {h.weight_kg}
                  </span>
                  <div
                    className="w-full bg-emerald-200 dark:bg-emerald-500/30 rounded-t-lg transition-all hover:bg-emerald-400 group-hover:scale-y-105"
                    style={{ height: `${Math.max(15, pct)}%` }}
                  />
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-1.5">
                    {dayStr}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Lịch sử cân nặng (8 lần gần nhất)</p>
        </div>
      )}

      {/* Input check-in */}
      {showInput && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 mb-2">
            📝 Check-in cân nặng hôm nay:
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`VD: ${current}`}
              step="0.1"
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleSave}
              disabled={loading || !input}
              className="px-5 py-2.5 rounded-2xl hoverboard-gradient text-white font-bold text-sm disabled:opacity-50"
            >
              {loading ? '...' : 'Lưu'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            💡 Plan dinh dưỡng sẽ tự động cập nhật theo cân nặng mới
          </p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

interface MonthlyDay {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  steps: number
  water_ml: number
  exercise_minutes: number
}

interface MonthlySummary {
  year: number
  month: number
  days: MonthlyDay[]
  avgCalories: number
  avgProtein: number
  avgSteps: number
}

function formatMonth(year: number, month: number) {
  return `${month.toString().padStart(2, '0')}/${year}`
}

export function MonthlySummaryCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [metric, setMetric] = useState<'calories' | 'protein' | 'steps' | 'water'>('calories')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/monthly-summary?year=${year}&month=${month}&t=${Date.now()}`,
          { cache: 'no-store' }
        )
        if (!res.ok) {
          throw new Error('Không tải được tổng kết tháng.')
        }
        const json = (await res.json()) as MonthlySummary
        setData(json)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month, refreshKey])

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const chartData = useMemo(
    () =>
      data?.days.map((d) => ({
        label: new Date(d.date).getDate().toString().padStart(2, '0'),
        calories: Math.round(d.calories),
        protein: Math.round(d.protein),
        steps: d.steps,
        water: Math.round(d.water_ml / 100) / 10, // lít, 1 số thập phân
      })) ?? [],
    [data],
  )

  return (
    <div className="glass-card rounded-[2rem] p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/90 to-teal-400 flex items-center justify-center shadow-md">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng kết tháng
            </p>
            <p className="text-xs font-semibold text-slate-500">
              Xem lại tiến độ các tháng trước
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[64px] text-center">
            {formatMonth(year, month)}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-slate-50 animate-pulse" />
      ) : !data || data.days.length === 0 ? (
        <p className="text-xs text-slate-400">
          Chưa có dữ liệu cho tháng {formatMonth(year, month)}. Hãy log bữa ăn
          và thói quen mỗi ngày để xem tổng kết ở đây.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 px-3 py-2 text-xs text-emerald-700 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide">
                TB kcal/ngày
              </p>
              <p className="text-lg font-black">
                {Math.round(data.avgCalories).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide">
                TB protein/ngày
              </p>
              <p className="text-lg font-black text-slate-800">
                {Math.round(data.avgProtein)}g
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide">
                TB steps/ngày
              </p>
              <p className="text-lg font-black text-slate-800">
                {Math.round(data.avgSteps).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Xu hướng theo ngày
            </p>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
              {[
                { id: 'calories', label: 'Calories' },
                { id: 'protein', label: 'Protein' },
                { id: 'steps', label: 'Steps' },
                { id: 'water', label: 'Water' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${metric === m.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-32 md:h-40 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="stepsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="waterArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="proteinArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--tw-slate-900, #0f172a)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 16,
                    padding: '10px 14px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  }}
                  labelStyle={{
                    color: '#f8fafc',
                    fontWeight: '800',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '6px'
                  }}
                  itemStyle={{
                    color: '#10b981',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    padding: '2px 0'
                  }}
                  labelFormatter={(value) => `Ngày ${value}`}
                />
                {metric === 'calories' && (
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#calArea)"
                    name="Calories"
                  />
                )}
                {metric === 'steps' && (
                  <Area
                    type="monotone"
                    dataKey="steps"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#stepsArea)"
                    name="Steps"
                  />
                )}
                {metric === 'protein' && (
                  <Area
                    type="monotone"
                    dataKey="protein"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#proteinArea)"
                    name="Protein"
                  />
                )}
                {metric === 'water' && (
                  <Area
                    type="monotone"
                    dataKey="water"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#waterArea)"
                    name="Water"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>


        </>
      )}
    </div>
  )
}


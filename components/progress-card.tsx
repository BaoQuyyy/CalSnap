'use client'

import { Flame, Flag } from 'lucide-react'

interface ProgressCardProps {
  streak: number
  weeklyMeals: number
}

export function ProgressCard({ streak, weeklyMeals }: ProgressCardProps) {
  return (
    <div className="glass-card rounded-[2.5rem] p-8">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Your Progress</h3>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Flame size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{streak}</p>
            <p className="text-xs text-slate-500 font-medium">Streak days</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Flag size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{weeklyMeals}</p>
            <p className="text-xs text-slate-500 font-medium">Meals this week</p>
          </div>
        </div>
      </div>
    </div>
  )
}

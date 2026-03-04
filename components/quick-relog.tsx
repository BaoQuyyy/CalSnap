'use client'

import { useState } from 'react'
import { History, Plus } from 'lucide-react'

interface RecentMeal {
  id: string
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface QuickRelogProps {
  recentMeals: RecentMeal[]
  onRelog: (meal: RecentMeal) => Promise<void>
}

export function QuickRelog({ recentMeals, onRelog }: QuickRelogProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (recentMeals.length === 0) return null

  const unique = recentMeals
    .reduce((acc: RecentMeal[], meal) => {
      if (!acc.find((m) => m.food_name === meal.food_name)) acc.push(meal)
      return acc
    }, [])
    .slice(0, 5)

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
        <History size={12} /> Món ăn gần đây
      </p>
      <div className="flex flex-col gap-1.5">
        {unique.map((meal) => (
          <button
            key={meal.id}
            id={`meal-${meal.id}`}
            onClick={async () => {
              setLoading(meal.id)
              await onRelog(meal)
              setLoading(null)
            }}
            disabled={loading === meal.id}
            className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-700 border border-transparent transition-all group disabled:opacity-60"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {meal.food_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                {meal.calories} kcal · P:{meal.protein}g · C:{meal.carbs}g
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 group-hover:bg-emerald-500 flex items-center justify-center transition-colors">
              <Plus
                size={14}
                className="text-emerald-600 group-hover:text-white"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { deleteMeal } from '@/app/actions/meals'
import { Button } from '@/components/ui/button'
import { Trash, Flame, Beef, Wheat, Droplets, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MealCardProps {
    meal: {
        id: string
        food_name: string
        calories: number
        protein: number
        carbs: number
        fat: number
        created_at: string
        is_favorite?: boolean
    }
    onToggleFavorite?: (id: string) => void
}

export function MealCard({ meal, onToggleFavorite }: MealCardProps) {
    const [deleting, setDeleting] = useState(false)

    async function handleDelete() {
        setDeleting(true)
        const result = await deleteMeal(meal.id)
        if (result?.error) {
            toast.error(result.error)
            setDeleting(false)
        } else {
            toast.success('Meal deleted')
        }
    }

    const time = new Date(meal.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    return (
        <div
            className={cn(
                'glass-card rounded-[2rem] p-4 border border-white/40 transition-all duration-200',
                deleting && 'opacity-50 pointer-events-none'
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{meal.food_name}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{time}</span>
                        </div>
                        {onToggleFavorite && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleFavorite(meal.id)
                                }}
                                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/40 shadow-sm hover:scale-110 active:scale-95 transition-all"
                                aria-label="Toggle favorite"
                            >
                                <Heart
                                    size={12}
                                    className={meal.is_favorite ? 'text-red-500 fill-red-500' : 'text-slate-300 dark:text-slate-600'}
                                />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <Flame className="h-3.5 w-3.5" />
                            {meal.calories} kcal
                        </span>
                        <MacroBadge icon={Beef} label="P" value={meal.protein} unit="g" color="text-blue-500 dark:text-blue-400" />
                        <MacroBadge icon={Wheat} label="C" value={meal.carbs} unit="g" color="text-amber-600 dark:text-amber-400" />
                        <MacroBadge icon={Droplets} label="F" value={meal.fat} unit="g" color="text-orange-500 dark:text-orange-400" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function MacroBadge({
    icon: Icon,
    label,
    value,
    unit,
    color,
}: {
    icon: React.ElementType
    label: string
    value: number
    unit: string
    color: string
}) {
    return (
        <span className={cn('flex items-center gap-0.5 text-xs font-semibold', color)}>
            <Icon className="h-3 w-3" />
            {label} {value}{unit}
        </span>
    )
}

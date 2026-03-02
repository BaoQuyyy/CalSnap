'use client'

import { useState } from 'react'
import { deleteMeal } from '@/app/actions/meals'
import { Button } from '@/components/ui/button'
import { Trash2, Flame, Beef, Wheat, Droplets } from 'lucide-react'
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
    }
}

export function MealCard({ meal }: MealCardProps) {
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
                    <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-sm text-slate-800 truncate">{meal.food_name}</h3>
                        <span className="text-xs text-slate-500 shrink-0">{time}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                            <Flame className="h-3.5 w-3.5" />
                            {meal.calories} kcal
                        </span>
                        <MacroBadge icon={Beef} label="P" value={meal.protein} unit="g" color="text-blue-500" />
                        <MacroBadge icon={Wheat} label="C" value={meal.carbs} unit="g" color="text-amber-600" />
                        <MacroBadge icon={Droplets} label="F" value={meal.fat} unit="g" color="text-orange-500" />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 min-w-[44px] min-h-[44px] h-11 w-11 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 touch-target flex items-center justify-center"
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label="Delete meal"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
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

'use client'

import { useState, useEffect } from 'react'
import { deleteMeal, updateMealNutrition } from '@/app/actions/meals'
import { Button } from '@/components/ui/button'
import { Trash, Flame, Beef, Wheat, Droplets, Heart, Check, X as CloseIcon } from 'lucide-react'
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
        logged_at: string
        is_favorite?: boolean
    }
    onToggleFavorite?: (id: string) => void
    onUpdate?: (meal: any) => void
}

export function MealCard({ meal, onToggleFavorite, onUpdate }: MealCardProps) {
    const [deleting, setDeleting] = useState(false)
    const [highlight, setHighlight] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    })
    const [isSaving, setIsSaving] = useState(false)

    const triggerHaptic = () => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([12])
        }
    }

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.mealId === meal.id || (detail?.foodName && meal.food_name.toLowerCase().includes(detail.foodName.toLowerCase()))) {
                setHighlight(true)
                const timer = setTimeout(() => setHighlight(false), 2500)
                return () => clearTimeout(timer)
            }
        }
        window.addEventListener('calsnap:meal-highlight', handler)

        const editHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.mealId === meal.id) {
                console.log('Edit event received for meal:', meal.id)
                startEditing()
            }
        }
        window.addEventListener('calsnap:meal-start-edit', editHandler)

        return () => {
            window.removeEventListener('calsnap:meal-highlight', handler)
            window.removeEventListener('calsnap:meal-start-edit', editHandler)
        }
    }, [meal.id, meal.food_name, meal.calories])

    const startEditing = () => {
        setEditData({
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat
        })
        setIsEditing(true)
        triggerHaptic()
    }

    const cancelEditing = () => {
        setIsEditing(false)
    }

    const saveEdit = async () => {
        if (isSaving) return

        setIsSaving(true)
        console.log(`[Edit] Updating meal ${meal.id} with data:`, editData)

        try {
            const res = await updateMealNutrition(meal.id, editData)

            if (res.success) {
                console.log('[Edit] Success:', res.data)
                triggerHaptic()

                if (onUpdate && res.data) {
                    onUpdate(res.data)
                }

                setIsEditing(false)
                toast.success('Đã cập nhật số liệu! ✨')

                window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
                    detail: { date: meal.logged_at }
                }))
            } else {
                console.error('[Edit] Error:', res.error)
                toast.error(res.error || 'Không thể cập nhật')
            }
        } catch (err: any) {
            console.error('[Edit] Exception:', err)
            toast.error('Lỗi kết nối hoặc hệ thống')
        } finally {
            setIsSaving(false)
        }
    }

    const time = new Date(meal.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    return (
        <div
            id={`meal-${meal.id}`}
            className={cn(
                'glass-card rounded-[2rem] p-4 border border-white/40 transition-all duration-200',
                deleting && 'opacity-50 pointer-events-none',
                highlight && 'magic-highlight scale-[1.02] z-10'
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
                    <div className="flex flex-col gap-3">
                        {isEditing ? (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800/50 animate-in fade-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight ml-1">Calories</label>
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                                            <Flame size={14} className="text-emerald-500" />
                                            <input
                                                autoFocus
                                                type="number"
                                                inputMode="numeric"
                                                value={editData.calories}
                                                onChange={e => setEditData(prev => ({ ...prev, calories: Math.round(Number(e.target.value)) }))}
                                                className="w-full bg-transparent text-sm font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight ml-1">Protein (g)</label>
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                                            <Beef size={14} className="text-blue-500" />
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                value={editData.protein}
                                                onChange={e => setEditData(prev => ({ ...prev, protein: Math.round(Number(e.target.value)) }))}
                                                className="w-full bg-transparent text-sm font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight ml-1">Carbs (g)</label>
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                                            <Wheat size={14} className="text-amber-500" />
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                value={editData.carbs}
                                                onChange={e => setEditData(prev => ({ ...prev, carbs: Math.round(Number(e.target.value)) }))}
                                                className="w-full bg-transparent text-sm font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight ml-1">Fat (g)</label>
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                                            <Droplets size={14} className="text-orange-500" />
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                value={editData.fat}
                                                onChange={e => setEditData(prev => ({ ...prev, fat: Math.round(Number(e.target.value)) }))}
                                                className="w-full bg-transparent text-sm font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={saveEdit}
                                        disabled={isSaving}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold active:scale-95 transition-all"
                                    >
                                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={cancelEditing}
                                        className="rounded-xl h-10 px-4 border-slate-200 dark:border-slate-800 active:scale-95 transition-all"
                                    >
                                        Hủy
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={startEditing}
                                    className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2.5 py-1 rounded-xl transition-all active:scale-95"
                                >
                                    <Flame className="h-4 w-4" />
                                    {meal.calories} kcal
                                </button>

                                <button onClick={startEditing} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 px-2 py-1 rounded-xl transition-all active:scale-95 group">
                                    <MacroBadge icon={Beef} label="P" value={meal.protein} unit="g" color="text-blue-500 dark:text-blue-400" />
                                </button>
                                <button onClick={startEditing} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 px-2 py-1 rounded-xl transition-all active:scale-95 group">
                                    <MacroBadge icon={Wheat} label="C" value={meal.carbs} unit="g" color="text-amber-600 dark:text-amber-400" />
                                </button>
                                <button onClick={startEditing} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 px-2 py-1 rounded-xl transition-all active:scale-95 group">
                                    <MacroBadge icon={Droplets} label="F" value={meal.fat} unit="g" color="text-orange-500 dark:text-orange-400" />
                                </button>
                            </div>
                        )}
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
        <span className={cn('flex items-center gap-1 text-xs font-bold transition-transform group-hover:scale-110', color)}>
            <Icon className="h-3.5 w-3.5" />
            {label} {value}{unit}
        </span>
    )
}

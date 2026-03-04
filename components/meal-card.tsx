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
        is_favorite?: boolean
    }
    onToggleFavorite?: (id: string) => void
}

export function MealCard({ meal, onToggleFavorite }: MealCardProps) {
    const [deleting, setDeleting] = useState(false)
    const [highlight, setHighlight] = useState(false)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const triggerHaptic = () => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(10)
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
        return () => window.removeEventListener('calsnap:meal-highlight', handler)
    }, [meal.id, meal.food_name])

    const startEditing = (field: string, value: number | string) => {
        setEditingField(field)
        setEditValue(value.toString())
        triggerHaptic()
    }

    const cancelEditing = () => {
        setEditingField(null)
        setEditValue('')
    }

    const saveEdit = async () => {
        if (!editingField || isSaving) return

        setIsSaving(true)
        const numericValue = Math.round(Number(editValue) || 0)

        try {
            const res = await updateMealNutrition(meal.id, {
                [editingField]: numericValue
            })

            if (res.success) {
                triggerHaptic()
                setEditingField(null)
                // Notify parent to refresh totals
                window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
                    detail: { date: meal.created_at.split('T')[0] }
                }))
            } else {
                toast.error('Không thể cập nhật')
            }
        } catch (err) {
            toast.error('Lỗi kết nối')
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
                    <div className="flex items-center gap-3 flex-wrap">
                        {editingField === 'calories' ? (
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-1 py-0.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in zoom-in-95 duration-200">
                                <input
                                    autoFocus
                                    type="number"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                    className="w-16 bg-transparent text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                                />
                                <Check size={14} className="text-emerald-500" />
                            </div>
                        ) : (
                            <button
                                onClick={() => startEditing('calories', meal.calories)}
                                className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2 py-0.5 rounded-lg transition-colors"
                            >
                                <Flame className="h-3.5 w-3.5" />
                                {meal.calories} kcal
                            </button>
                        )}

                        <MacroEditable badgeProps={{ icon: Beef, label: "P", value: meal.protein, unit: "g", color: "text-blue-500 dark:text-blue-400" }} field="protein" editingField={editingField} editValue={editValue} setEditValue={setEditValue} onStart={startEditing} onSave={saveEdit} onCancel={cancelEditing} />
                        <MacroEditable badgeProps={{ icon: Wheat, label: "C", value: meal.carbs, unit: "g", color: "text-amber-600 dark:text-amber-400" }} field="carbs" editingField={editingField} editValue={editValue} setEditValue={setEditValue} onStart={startEditing} onSave={saveEdit} onCancel={cancelEditing} />
                        <MacroEditable badgeProps={{ icon: Droplets, label: "F", value: meal.fat, unit: "g", color: "text-orange-500 dark:text-orange-400" }} field="fat" editingField={editingField} editValue={editValue} setEditValue={setEditValue} onStart={startEditing} onSave={saveEdit} onCancel={cancelEditing} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function MacroEditable({
    badgeProps,
    field,
    editingField,
    editValue,
    setEditValue,
    onStart,
    onSave,
    onCancel
}: {
    badgeProps: any,
    field: string,
    editingField: string | null,
    editValue: string,
    setEditValue: (v: string) => void,
    onStart: (f: string, v: number) => void,
    onSave: () => void,
    onCancel: () => void
}) {
    const isEditing = editingField === field

    if (isEditing) {
        return (
            <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900 rounded-lg px-1 animate-in fade-in scale-95 duration-200">
                <input
                    autoFocus
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={onSave}
                    onKeyDown={e => e.key === 'Enter' && onSave()}
                    className={cn('w-10 bg-transparent text-xs font-bold focus:outline-none', badgeProps.color)}
                />
                <span className={cn('text-[10px] font-bold', badgeProps.color)}>{badgeProps.unit}</span>
            </div>
        )
    }

    return (
        <button
            onClick={() => onStart(field, badgeProps.value)}
            className={cn('hover:bg-slate-50 dark:hover:bg-slate-950/40 px-1.5 py-0.5 rounded-lg transition-colors')}
        >
            <MacroBadge {...badgeProps} />
        </button>
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

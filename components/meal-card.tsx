'use client'

import { useState, useEffect } from 'react'
import { updateMealNutrition } from '@/app/actions/meals'
import { Button } from '@/components/ui/button'
import { Flame, Beef, Wheat, Droplets, Heart, X as CloseIcon } from 'lucide-react'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerHaptic } from '@/lib/feedback'

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
    onDelete?: (id: string) => void
}

export function MealCard({ meal, onToggleFavorite, onUpdate, onDelete }: MealCardProps) {
    const [deleting, setDeleting] = useState(false)
    const [highlight, setHighlight] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [displayData, setDisplayData] = useState({
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
    })

    const [editData, setEditData] = useState({
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
    })

    // ✅ FIX THẬT SỰ: chỉ reset khi meal.id đổi (sang card khác)
    // KHÔNG sync khi values thay đổi — tránh router.refresh() ghi đè
    useEffect(() => {
        setDisplayData({
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
        })
    }, [meal.id])

    const startEditing = () => {
        setEditData({ ...displayData })
        setIsEditing(true)
        triggerHaptic('light')
    }

    useEffect(() => {
        const highlightHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.mealId === meal.id) {
                setHighlight(true)
                setTimeout(() => setHighlight(false), 2500)
            }
        }
        const editHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.mealId === meal.id) startEditing()
        }
        window.addEventListener('calsnap:meal-highlight', highlightHandler)
        window.addEventListener('calsnap:meal-start-edit', editHandler)
        return () => {
            window.removeEventListener('calsnap:meal-highlight', highlightHandler)
            window.removeEventListener('calsnap:meal-start-edit', editHandler)
        }
    }, [meal.id])

    const cancelEditing = () => setIsEditing(false)

    const handleCaloriesChange = (val: string) => {
        const num = Math.max(0, Number(val))
        if (displayData.calories === 0) {
            setEditData(prev => ({ ...prev, calories: num }))
            return
        }
        const ratio = num / displayData.calories
        setEditData({
            calories: num,
            protein: Math.round((displayData.protein || 0) * ratio),
            carbs: Math.round((displayData.carbs || 0) * ratio),
            fat: Math.round((displayData.fat || 0) * ratio),
        })
    }

    const handleMacroChange = (field: 'protein' | 'carbs' | 'fat', val: string) => {
        setEditData(prev => ({ ...prev, [field]: Math.max(0, Math.round(Number(val))) }))
    }

    const saveEdit = async () => {
        if (isSaving) return
        if (editData.calories < 0 || editData.protein < 0 || editData.carbs < 0 || editData.fat < 0) {
            toast.error('Giá trị không được âm!')
            return
        }

        setIsSaving(true)
        try {
            const res = await updateMealNutrition(meal.id, {
                calories: editData.calories,
                protein: editData.protein,
                carbs: editData.carbs,
                fat: editData.fat,
            })

            if (res.success) {
                triggerHaptic('medium')

                // Dùng data từ server trả về (chắc chắn đúng)
                const saved = res.data ?? editData
                setDisplayData({
                    calories: saved.calories,
                    protein: saved.protein,
                    carbs: saved.carbs,
                    fat: saved.fat,
                })

                setIsEditing(false)

                onUpdate?.({
                    ...meal,
                    calories: saved.calories,
                    protein: saved.protein,
                    carbs: saved.carbs,
                    fat: saved.fat,
                })

                toast.success(`✅ Đã cập nhật · Tổng hôm nay: ${res.newTotals?.calories ?? '?'} kcal`)

                window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
                    detail: { date: meal.logged_at, totals: res.newTotals },
                }))
            } else {
                toast.error(res.error || 'Lỗi khi cập nhật')
            }
        } catch {
            toast.error('Lỗi kết nối, thử lại sau.')
        } finally {
            setIsSaving(false)
        }
    }

    const hasChanged =
        editData.calories !== displayData.calories ||
        editData.protein !== displayData.protein ||
        editData.carbs !== displayData.carbs ||
        editData.fat !== displayData.fat

    const time = new Date(meal.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    const DiffIndicator = ({ val, original, unit = '' }: { val: number; original: number; unit?: string }) => {
        const diff = val - original
        if (diff === 0) return null
        return (
            <span className={cn(
                'text-[10px] font-bold px-1 rounded-md ml-1.5',
                diff > 0 ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'
            )}>
                {diff > 0 ? '+' : ''}{diff}{unit}
            </span>
        )
    }

    return (
        <div
            id={`meal-${meal.id}`}
            className={cn(
                'glass-card rounded-[2.5rem] p-5 border border-white/40 transition-all duration-300 relative overflow-hidden',
                deleting && 'opacity-50 pointer-events-none',
                highlight && 'magic-highlight scale-[1.02] z-10',
                isEditing && 'border-emerald-500/40 shadow-xl shadow-emerald-500/10'
            )}
        >
            <motion.div layout className="flex flex-col gap-4">
                {/* Name & Time */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate">{meal.food_name}</h3>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{time}</span>
                    </div>
                    {!isEditing && onToggleFavorite && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(meal.id) }}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/40 shadow-sm active:scale-90 transition-all"
                        >
                            <Heart size={14} className={meal.is_favorite ? 'text-red-500 fill-red-500' : 'text-slate-300 dark:text-slate-600'} />
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {isEditing ? (
                        <motion.div
                            key="editing"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="space-y-4 overflow-hidden"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 ml-1 flex items-center">
                                    <Flame size={12} className="mr-1" /> CALORIES
                                </label>
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="number"
                                        inputMode="numeric"
                                        value={editData.calories === 0 ? '' : editData.calories}
                                        onChange={e => handleCaloriesChange(e.target.value)}
                                        className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 text-3xl font-black text-emerald-700 dark:text-emerald-300 px-4 py-4 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50 focus:border-emerald-500 focus:outline-none transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                        <span className="text-[10px] font-black text-emerald-500/50">KCAL</span>
                                        <DiffIndicator val={editData.calories} original={displayData.calories} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'P', field: 'protein', color: 'blue', icon: Beef },
                                    { label: 'C', field: 'carbs', color: 'amber', icon: Wheat },
                                    { label: 'F', field: 'fat', color: 'orange', icon: Droplets },
                                ].map((macro) => (
                                    <div key={macro.field} className="space-y-1">
                                        <label className={`text-[9px] font-black uppercase text-${macro.color}-500 ml-1 flex items-center`}>
                                            <macro.icon size={10} className="mr-1" /> {macro.label}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                value={editData[macro.field as keyof typeof editData] === 0 ? '' : editData[macro.field as keyof typeof editData]}
                                                onChange={e => handleMacroChange(macro.field as 'protein' | 'carbs' | 'fat', e.target.value)}
                                                className={`w-full bg-${macro.color}-50/30 dark:bg-${macro.color}-900/10 text-sm font-bold text-${macro.color}-600 dark:text-${macro.color}-400 px-3 py-2.5 rounded-xl border border-${macro.color}-100 dark:border-${macro.color}-900/30 focus:outline-none`}
                                            />
                                            <DiffIndicator
                                                val={Number(editData[macro.field as keyof typeof editData]) ?? 0}
                                                original={Number(displayData[macro.field as keyof typeof displayData]) ?? 0}
                                                unit="g"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <Button
                                    onClick={saveEdit}
                                    disabled={isSaving || !hasChanged}
                                    className="flex-1 hoverboard-gradient text-white rounded-2xl h-12 font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                                </Button>
                                <button
                                    onClick={cancelEditing}
                                    className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl active:scale-90 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    <CloseIcon size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-5"
                        >
                            <button
                                onClick={startEditing}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
                            >
                                <Flame className="h-4 w-4 fill-emerald-500/20" />
                                <span className="font-black text-base tabular-nums">{displayData.calories}</span>
                                <span className="text-[10px] font-bold opacity-70">KCAL</span>
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">{displayData.protein}g</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">{displayData.carbs}g</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">{displayData.fat}g</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
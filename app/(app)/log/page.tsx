// app/(app)/log/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getMealsForDate, relogMeal, toggleFavorite, deleteMeal } from '@/app/actions/meals'
import { MealCard } from '@/components/meal-card'
import { QuickRelog } from '@/components/quick-relog'
import { BookOpen, Flame, Heart, Info } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { MacroPill } from '@/components/macro-pill'
import { DatePicker } from '@/components/date-picker'
import { toast } from '@/components/toast'
import { SwipeableMealCard } from '@/components/swipeable-meal-card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type Meal = {
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export default function LogPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const today = new Date().toLocaleDateString('en-CA')
  const [date, setDate] = useState(today)
  const [meals, setMeals] = useState<Meal[]>([])
  const [recentMeals, setRecentMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)

  // Highlight effect
  useEffect(() => {
    const highlightId = searchParams.get('highlight')
    if (highlightId && !loading && meals.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`meal-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('glow-highlight')
          setTimeout(() => element.classList.remove('glow-highlight'), 3000)

          // Cleanup URL without refreshing
          const params = new URLSearchParams(searchParams.toString())
          params.delete('highlight')
          router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
      }, 500)
    }
  }, [searchParams, loading, meals, pathname, router])

  const dateObj = new Date(date + 'T12:00:00')
  const dayName = DAYS[dateObj.getDay()]

  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    setLoading(true)
    getMealsForDate(date).then((data) => {
      setMeals(data as Meal[])
      setLoading(false)
    })
  }, [date])

  useEffect(() => {
    getMealsForDate('recent').then((data) => {
      setRecentMeals(data as Meal[])
    })
  }, [])

  // Real-time sync listener
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { date?: string } | undefined
      const targetDate = detail?.date || today

      // If we are looking at the date that was updated, refresh the list
      if (targetDate === date) {
        const data = await getMealsForDate(date)
        setMeals(data as Meal[])
      }

      // Also refresh recent meals if it was today
      if (targetDate === today) {
        const recent = await getMealsForDate('recent')
        setRecentMeals(recent as Meal[])
      }
    }

    window.addEventListener('calsnap:meal-updated', handler)
    return () => window.removeEventListener('calsnap:meal-updated', handler)
  }, [date, today])

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const handleRelog = async (meal: { food_name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    await relogMeal(meal)
    toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`)
    // Dispatch sync event
    window.dispatchEvent(new CustomEvent('calsnap:meal-updated', { detail: { date: today } }))
    if (date === today) {
      const data = await getMealsForDate(today)
      setMeals(data as Meal[])
    }
  }

  const handleToggleFavorite = async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId)
    const willFavorite = !meal?.is_favorite
    await toggleFavorite(mealId)
    setMeals(prev => prev.map(m =>
      m.id === mealId ? { ...m, is_favorite: willFavorite } : m
    ))
    if (willFavorite) {
      toast.success('Đã lưu yêu thích! Món này sẽ hiện đầu tiên khi log lại nhanh.')
    } else {
      toast.success('Đã bỏ khỏi yêu thích')
    }
  }

  const handleDelete = async (mealId: string, foodName: string) => {
    const res = await deleteMeal(mealId)
    if (res?.error) {
      toast.error(res.error)
    } else {
      setMeals(prev => prev.filter(m => m.id !== mealId))
      toast.success(`Đã xóa: ${foodName}`)
      // Dispatch sync event
      window.dispatchEvent(new CustomEvent('calsnap:meal-updated', { detail: { date: date } }))
    }
  }

  const handleUpdateMeal = (updatedMeal: Meal) => {
    // 1. Update meals array (force new reference)
    const newMeals = meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
    setMeals([...newMeals])

    // 2. Also update recent meals
    setRecentMeals(prev => [...prev.map(m => m.id === updatedMeal.id ? updatedMeal : m)])

    // 3. Recalculate totals immediately for UI consistency
    // Note: totals state is derived from 'meals', but if we have a separate totals state or want to force it
    // In this component, 'totals' is a constant calculated on render, so setMeals is enough.

    // 4. Sync dashboard & adherence cards
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto page-enter pb-40">
      <div className="-mx-4 md:-mx-8 nutri-header">
        <div className="ios-reveal relative z-10 px-6 md:px-8 pt-12 pb-6">
          <h1 className="text-white text-2xl md:text-3xl font-display font-extrabold">
            Nhật ký ăn uống 📓
          </h1>
          <p className="text-white/75 text-sm mt-1">
            Xem lại bữa ăn theo ngày bạn chọn
          </p>
        </div>
      </div>

      {/* QuickRelog — chỉ hiện khi xem hôm nay */}
      {date === today && recentMeals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Log lại nhanh
            </p>
            <button
              onClick={() => setShowHint(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Info size={13} />
              <span>{showHint ? 'Ẩn hướng dẫn' : 'Hướng dẫn'}</span>
            </button>
          </div>

          {/* Hint box */}
          {showHint && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-4 space-y-2.5">
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Cách sử dụng:</p>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-xs font-black">+</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Nút cộng xanh</span> — Log lại món ăn này vào hôm nay chỉ với 1 chạm. Không cần scan lại!
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart size={16} className="text-red-400 fill-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Trái tim</span> — Đánh dấu yêu thích. Món yêu thích sẽ hiện đầu tiên để bạn log lại nhanh hơn.
                </p>
              </div>
            </div>
          )}

          <div className="ios-reveal delay-100">
            <QuickRelog recentMeals={recentMeals} onRelog={handleRelog} />
          </div>
        </div>
      )}

      {/* Date selector area */}
      <div className="space-y-4 ios-reveal delay-200">
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 scrollbar-hide px-1">
          {sevenDays.map((d) => {
            const isActive = d === date
            const dObj = new Date(d + 'T12:00:00')
            const label = DAYS[dObj.getDay()].toUpperCase().slice(0, 3)
            const num = dObj.getDate()
            const isToday = d === today
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={cn(
                  "shrink-0 flex flex-col items-center justify-center w-[60px] h-[75px] rounded-[1.5rem] transition-all duration-300",
                  isActive
                    ? "hoverboard-gradient text-white shadow-lg shadow-emerald-500/30 scale-105 z-10"
                    : isToday
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-800/50"
                      : "bg-white/40 dark:bg-slate-900/40 text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800/60"
                )}
              >
                <span className="text-[10px] font-black tracking-widest mb-1 opacity-70">{label}</span>
                <span className="text-xl font-black tabular-nums">{num}</span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-center px-2">
          <div className="w-full max-w-[280px] bg-white/40 dark:bg-slate-900/40 rounded-[2rem] p-1.5 border border-white/20 dark:border-white/5 shadow-sm">
            <DatePicker
              value={date}
              max={today}
              onChange={setDate}
              placeholder="Chọn ngày"
              className="w-full border-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Daily summary */}
      <motion.div layout className="glass-card rounded-[2rem] p-6 ios-reveal delay-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Tổng {date === today ? 'hôm nay' : 'trong ngày'}
        </h3>
        <div className="flex items-baseline gap-2 mb-4">
          <Flame className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
          <motion.span
            key={totals.calories}
            initial={{ scale: 1.1, color: '#10b981' }}
            animate={{ scale: 1, color: 'inherit' }}
            className="text-3xl font-display font-extrabold text-slate-900 dark:text-slate-100 tabular-nums"
          >
            {Math.round(totals.calories).toLocaleString()}
          </motion.span>
          <span className="text-slate-500 dark:text-slate-400 font-semibold">kcal</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <MacroPill type="protein" value={Math.round(totals.protein)} variant="light" />
          <MacroPill type="carbs" value={Math.round(totals.carbs)} variant="light" />
          <MacroPill type="fat" value={Math.round(totals.fat)} variant="light" />
        </div>
      </motion.div>

      {/* Hint nhỏ cho meal cards */}
      {meals.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Heart size={13} className="text-red-400 fill-red-400 shrink-0" />
          <p className="text-xs text-slate-400">
            Bấm trái tim để yêu thích · Bấm thùng rác để xóa bữa ăn
          </p>
        </div>
      )}

      {/* Meal cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[2rem] glass-card animate-pulse" />
          ))
        ) : meals.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12 text-slate-300 mx-auto" />}
            title="Chưa có bữa ăn nào"
            subtitle="Scan món ăn để bắt đầu theo dõi"
            ctaLabel="Scan món ăn"
            ctaHref="/scan"
          />
        ) : (
          meals.map((meal) => (
            <SwipeableMealCard
              key={meal.id}
              mealId={meal.id}
              onDelete={() => handleDelete(meal.id, meal.food_name)}
              onEdit={() => {
                window.dispatchEvent(new CustomEvent('calsnap:meal-start-edit', {
                  detail: { mealId: meal.id }
                }))
              }}
              className="relative"
            >
              <MealCard
                meal={meal}
                onToggleFavorite={handleToggleFavorite}
                onUpdate={handleUpdateMeal}
              />
            </SwipeableMealCard>
          ))
        )}
      </div>

      <Link
        href="/scan"
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 hoverboard-gradient rounded-full items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
        aria-label="Scan food"
      >
        <Flame className="h-6 w-6" />
      </Link>
    </div>
  )
}

// app/(app)/log/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { getMealsForDate, relogMeal, toggleFavorite, deleteMeal } from '@/app/actions/meals'
import { MealCard } from '@/components/meal-card'
import { QuickRelog } from '@/components/quick-relog'
import { Flame, Heart, Info, Dices } from 'lucide-react'
import Link from 'next/link'
import { MacroPill } from '@/components/macro-pill'
import { DatePicker } from '@/components/date-picker'
import { toast } from '@/components/toast'
import { SwipeableMealCard } from '@/components/swipeable-meal-card'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { MealRouletteWheel } from '@/components/meal-roulette-wheel'

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

// Feature 4: Random meal suggestions
const VIETNAMESE_MEALS = [
  { name: 'Phở bò', calories: 450 },
  { name: 'Cơm tấm sườn bì chả', calories: 650 },
  { name: 'Bánh mì thịt', calories: 380 },
  { name: 'Bún bò Huế', calories: 480 },
  { name: 'Gỏi cuốn (2 cuốn)', calories: 160 },
  { name: 'Cơm gà Hải Nam', calories: 550 },
  { name: 'Bún chả', calories: 500 },
  { name: 'Bánh xèo', calories: 420 },
  { name: 'Cháo gà', calories: 280 },
  { name: 'Xôi xéo', calories: 350 },
  { name: 'Hủ tiếu Nam Vang', calories: 460 },
  { name: 'Mì Quảng', calories: 430 },
  { name: 'Bánh cuốn', calories: 300 },
  { name: 'Cơm chiên dương châu', calories: 580 },
  { name: 'Bún riêu', calories: 400 },
  { name: 'Lẩu thái (1 phần)', calories: 520 },
  { name: 'Bánh bao (2 cái)', calories: 360 },
  { name: 'Cơm bình dân (cơm + 2 món)', calories: 600 },
  { name: 'Sandwich trứng', calories: 320 },
  { name: 'Salad gà', calories: 250 },
]

const MOOD_OPTIONS = [
  { emoji: '😋', label: 'ngon' },
  { emoji: '🤤', label: 'quá ngon' },
  { emoji: '😐', label: 'bình thường' },
  { emoji: '🥴', label: 'no quá' },
]

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
  // Feature 3: Mood emoji picker
  const [moodMealId, setMoodMealId] = useState<string | null>(null)
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Feature 4: Roulette
  const [showRoulette, setShowRoulette] = useState(false)

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

  // Cleanup mood timer on unmount
  useEffect(() => {
    return () => {
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    }
  }, [])

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const handleRelog = async (meal: { id?: string; food_name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    const result = await relogMeal(meal)
    const newMealId = (result as any)?.data?.id
    toast.success(`Đã log lại: ${meal.food_name} (${meal.calories} kcal)`)
    // Dispatch sync event
    window.dispatchEvent(new CustomEvent('calsnap:meal-updated', { detail: { date: today } }))
    if (date === today) {
      const data = await getMealsForDate(today)
      setMeals(data as Meal[])
    }
    // Feature 3: Show mood picker after logging
    if (newMealId) {
      showMoodPicker(newMealId)
    }
  }

  // Feature 3: Mood picker helpers
  const showMoodPicker = (mealId: string) => {
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    setMoodMealId(mealId)
    moodTimerRef.current = setTimeout(() => {
      setMoodMealId(null)
    }, 3000)
  }

  const handleMoodSelect = (mealId: string, emoji: string) => {
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    try {
      localStorage.setItem(`calsnap_meal_mood_${mealId}`, emoji)
    } catch { }
    setMoodMealId(null)
  }

  // Feature 4: Roulette helpers
  const spinRoulette = () => {
    setShowRoulette(true)
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-white text-2xl md:text-3xl font-display font-extrabold">
                Nhật ký ăn uống 📓
              </h1>
              <p className="text-white/75 text-sm mt-1">
                Xem lại bữa ăn theo ngày bạn chọn
              </p>
            </div>
            {/* Feature 4: Roulette button */}
            <button
              type="button"
              onClick={spinRoulette}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all mt-1 shrink-0"
            >
              <Dices className="h-3.5 w-3.5" />
              Gợi ý 🎰
            </button>
          </div>
        </div>
      </div>

      {/* Feature 4: Meal Roulette Wheel modal */}
      <AnimatePresence>
        {showRoulette && (
          <MealRouletteWheel
            meals={VIETNAMESE_MEALS}
            onSelectMeal={() => setShowRoulette(false)}
            onClose={() => setShowRoulette(false)}
          />
        )}
      </AnimatePresence>

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
          <div className="w-full max-w-[280px] bg-white/40 dark:bg-slate-900/40 rounded-[2rem] p-1.5 border border-white/20 dark:border-white/5 shadow-sm overflow-visible relative">
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
          /* Feature 6: Fun empty state mascot */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card rounded-[2rem] p-10 text-center"
          >
            <div className="text-6xl animate-bounce mb-4 inline-block">🐱</div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
              Bụng đang kêu gọi...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Chưa có bữa ăn nào hôm nay. Thêm bữa đầu tiên nào!
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl hoverboard-gradient text-white text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              <Flame className="h-4 w-4" />
              Scan món ăn
            </Link>
          </motion.div>
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

      {/* Feature 3: Mood emoji picker */}
      <AnimatePresence>
        {moodMealId && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm"
          >
            <div className="glass-card rounded-[2rem] px-5 py-4 shadow-2xl border border-white/20 dark:border-white/10">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center mb-3">
                Bữa ăn thế nào?
              </p>
              <div className="flex justify-center gap-3">
                {MOOD_OPTIONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleMoodSelect(moodMealId, emoji)}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
                    title={label}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

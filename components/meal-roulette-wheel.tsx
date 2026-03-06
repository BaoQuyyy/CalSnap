'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { triggerHaptic } from '@/lib/feedback'
import { cn } from '@/lib/utils'

const WHEEL_COLORS = [
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#34d399', // emerald-400
  '#2dd4bf', // teal-400
  '#22d3ee', // cyan-400
  '#059669', // emerald-600
  '#0d9488', // teal-600
]

const CANVAS_SIZE = 320
const MAX_DISPLAY_MEALS = 16
const SPIN_DURATION_MS = 3500
const MIN_EXTRA_SPINS = 5
const RANDOM_EXTRA_SPINS_RANGE = 4
const CANVAS_DISPLAY_SIZE = 'min(72vw, 280px)'

interface MealRouletteWheelProps {
  meals: { name: string; calories: number }[]
  onSelectMeal: (meal: { name: string; calories: number }) => void
  onClose: () => void
}

function drawWheel(
  canvas: HTMLCanvasElement,
  meals: { name: string; calories: number }[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = CANVAS_SIZE
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 4
  const numMeals = meals.length
  const anglePer = 360 / numMeals

  ctx.clearRect(0, 0, size, size)

  // Outer shadow ring
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.22)'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.restore()

  for (let i = 0; i < numMeals; i++) {
    const startAngle = ((i * anglePer) - 90) * (Math.PI / 180)
    const endAngle = (((i + 1) * anglePer) - 90) * (Math.PI / 180)
    const midAngle = (((i + 0.5) * anglePer) - 90) * (Math.PI / 180)
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length]

    // Wedge fill
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Radial text
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(midAngle)

    const fontSize = numMeals <= 8 ? 12 : numMeals <= 12 ? 10 : 9
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 3

    // Truncate long names to fit in the wedge
    const maxWidth = radius * 0.76
    let text = meals[i].name
    while (ctx.measureText(text).width > maxWidth && text.length > 4) {
      text = text.slice(0, -2) + '…'
    }
    ctx.fillText(text, radius * 0.9, 0)
    ctx.restore()
  }

  // Center hub
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.11, 0, Math.PI * 2)
  const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.11)
  hub.addColorStop(0, '#ffffff')
  hub.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = hub
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 2
  ctx.stroke()
}

export function MealRouletteWheel({ meals, onSelectMeal, onClose }: MealRouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<{ name: string; calories: number } | null>(null)
  const currentRotationRef = useRef(0)

  const displayMeals = useMemo(() => meals.slice(0, MAX_DISPLAY_MEALS), [meals])
  const numMeals = displayMeals.length
  const anglePer = 360 / numMeals

  // Draw static wheel onto canvas
  useEffect(() => {
    if (canvasRef.current) {
      drawWheel(canvasRef.current, displayMeals)
    }
  }, [displayMeals])

  const spin = useCallback(() => {
    if (isSpinning || numMeals === 0) return

    triggerHaptic('medium')
    setIsSpinning(true)
    setSelectedMeal(null)

    // Pre-determine the winning wedge
    const winIndex = Math.floor(Math.random() * numMeals)

    // Calculate delta rotation so the winning wedge center aligns with the pointer (top)
    const currentAngle = currentRotationRef.current % 360
    const targetAngle = (winIndex + 0.5) * anglePer
    let deltaAngle = ((targetAngle - currentAngle) + 360) % 360
    if (deltaAngle < anglePer * 0.5) deltaAngle += 360

    const extraSpins = (MIN_EXTRA_SPINS + Math.floor(Math.random() * RANDOM_EXTRA_SPINS_RANGE)) * 360
    const targetDegrees = currentRotationRef.current + extraSpins + deltaAngle

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
      wheelRef.current.style.transform = `rotate(${targetDegrees}deg)`
    }

    setTimeout(() => {
      const meal = displayMeals[winIndex]
      currentRotationRef.current = targetDegrees
      setSelectedMeal(meal)
      setIsSpinning(false)

      triggerHaptic('success')

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#10b981', '#14b8a6', '#06b6d4', '#34d399', '#fbbf24', '#f472b6'],
        gravity: 0.85,
        scalar: 0.95,
      })
    }, SPIN_DURATION_MS)
  }, [isSpinning, numMeals, anglePer, displayMeals])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden flex flex-col max-h-[90dvh] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex flex-col px-6 pt-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            🎰 Món ăn hôm nay?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5">
          {/* Pointer + Wheel */}
          <div className="relative flex items-center justify-center w-full">
            {/* Fixed pointer arrow above the wheel */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
              <motion.div
                animate={selectedMeal ? { y: [0, -5, 0, -3, 0] } : {}}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
                  <path d="M11 26L0 0h22L11 26z" fill="#ef4444" />
                  <path d="M11 20L3 3h16L11 20z" fill="rgba(255,255,255,0.25)" />
                </svg>
              </motion.div>
            </div>

            {/* Spinning wheel wrapper */}
            <div
              ref={wheelRef}
              className="rounded-full shadow-2xl mt-5"
              style={{ willChange: 'transform' }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="block rounded-full"
                style={{ width: CANVAS_DISPLAY_SIZE, height: CANVAS_DISPLAY_SIZE }}
              />
            </div>
          </div>

          {/* Spin button */}
          <button
            type="button"
            onClick={spin}
            disabled={isSpinning}
            className={cn(
              'w-full py-4 rounded-2xl hoverboard-gradient text-white font-black text-lg shadow-lg shadow-emerald-500/30 transition-all tracking-wide',
              isSpinning
                ? 'opacity-70 cursor-not-allowed scale-95'
                : 'hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            {isSpinning ? 'Đang quay... 🌀' : 'Quay! 🎰'}
          </button>

          {/* Result card */}
          <AnimatePresence>
            {selectedMeal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="w-full glass-card rounded-[1.5rem] p-4 border border-emerald-100/50 dark:border-emerald-800/30"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                  🎉 Kết quả
                </p>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-0.5">
                  {selectedMeal.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  ~{selectedMeal.calories} kcal
                </p>
                <Link
                  href={`/scan?prefill=${encodeURIComponent(selectedMeal.name)}`}
                  onClick={() => onSelectMeal(selectedMeal)}
                  className="block w-full py-3 rounded-2xl hoverboard-gradient text-white text-sm font-black text-center shadow-md shadow-emerald-500/20"
                >
                  Dùng gợi ý này ✓
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
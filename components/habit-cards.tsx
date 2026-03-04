'use client'

import { useState, useEffect } from 'react'
import { Footprints, Droplets, Dumbbell, Plus, Minus } from 'lucide-react'
import { upsertSteps, upsertWater, upsertExercise, type ExerciseType } from '@/app/actions/habits'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const GLASS_ML = 250
const STEPS_GOAL = 10000
const WATER_GLASSES = 8

interface HabitCardsProps {
  date: string
  initialHabits: {
    steps: number
    water_ml: number
    exercise_minutes: number
    exercise_calories: number
  } | null
  onUpdate?: (newExerciseCalories?: number) => void
  className?: string
}

export function HabitCards({ date, initialHabits, onUpdate, className }: HabitCardsProps) {
  const [steps, setSteps] = useState(initialHabits?.steps ?? 0)
  const [waterMl, setWaterMl] = useState(initialHabits?.water_ml ?? 0)
  const [exerciseMinutes, setExerciseMinutes] = useState(initialHabits?.exercise_minutes ?? 0)
  const [exerciseCalories, setExerciseCalories] = useState(initialHabits?.exercise_calories ?? 0)
  const [editingSteps, setEditingSteps] = useState(false)
  const [stepsInput, setStepsInput] = useState('')
  const [editingExercise, setEditingExercise] = useState(false)
  const [exMinutes, setExMinutes] = useState('')
  const [exType, setExType] = useState<ExerciseType>('Walking')

  useEffect(() => {
    setSteps(initialHabits?.steps ?? 0)
    setWaterMl(initialHabits?.water_ml ?? 0)
    setExerciseMinutes(initialHabits?.exercise_minutes ?? 0)
    setExerciseCalories(initialHabits?.exercise_calories ?? 0)
  }, [initialHabits])

  const waterGlasses = Math.round(waterMl / GLASS_ML)
  const stepsPercent = Math.min(100, (steps / STEPS_GOAL) * 100)
  const stepsCalories = steps <= 0 ? 0 : Math.max(1, Math.round(steps * 0.04))
  const waterPercent = Math.min(100, (waterGlasses / WATER_GLASSES) * 100)
  const exercisePercent = Math.min(100, (exerciseMinutes / 30) * 100)

  const handleSaveSteps = async () => {
    const val = parseInt(stepsInput, 10)
    if (isNaN(val) || val < 0) return
    setEditingSteps(false)
    const res = await upsertSteps(date, val)
    if (res.error) toast.error(res.error)
    else {
      setSteps(val);
      onUpdate?.();
      window.dispatchEvent(new CustomEvent('calsnap:habit-updated', { detail: { date } }))
    }
  }

  const handleSaveExercise = async () => {
    const mins = parseInt(exMinutes, 10)
    if (isNaN(mins) || mins <= 0) return
    setEditingExercise(false)
    const res = await upsertExercise(date, mins, exType)
    if ((res as any).error) { toast.error((res as any).error); return }
    const newCal = (res as any).newCalories ?? exerciseCalories
    setExerciseMinutes((p) => p + mins)
    setExerciseCalories(newCal)
    setExMinutes('')
    onUpdate?.(newCal)
    window.dispatchEvent(new CustomEvent('calsnap:habit-updated', { detail: { date } }))
  }

  const addSteps = async (s: number) => {
    const newVal = steps + s
    const res = await upsertSteps(date, newVal)
    if (res.error) toast.error(res.error)
    else {
      setSteps(newVal);
      onUpdate?.();
      window.dispatchEvent(new CustomEvent('calsnap:habit-updated', { detail: { date } }))
    }
  }

  const addWater = async (ml: number) => {
    const newMl = Math.max(0, waterMl + ml)
    const res = await upsertWater(date, newMl)
    if (res.error) toast.error(res.error)
    else {
      setWaterMl(newMl);
      onUpdate?.();
      window.dispatchEvent(new CustomEvent('calsnap:water-updated', { detail: { date, water_ml: newMl } }))
    }
  }

  return (
    <div className={cn("glass-card rounded-[2rem] p-5 flex flex-col gap-5", className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Habits</h3>

      {/* ── STEPS ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
            <Footprints size={18} className="text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Steps</span>
              {editingSteps ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number" value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSteps()}
                    className="w-20 px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveSteps} className="text-[11px] font-black text-emerald-600">✓</button>
                  <button onClick={() => setEditingSteps(false)} className="text-[11px] font-bold text-slate-400">✕</button>
                </div>
              ) : (
                <button onClick={() => { setStepsInput(String(steps)); setEditingSteps(true) }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 tabular-nums">
                  {steps.toLocaleString()}<span className="text-slate-400">/{STEPS_GOAL.toLocaleString()} · ~{stepsCalories}kcal</span>
                </button>
              )}
            </div>
            <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${stepsPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 pl-12 flex-wrap">
          {[1000, 3000, 5000].map((s) => (
            <button key={s} onClick={() => addSteps(s)}
              className="px-3.5 py-2 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 text-[11px] font-bold hover:bg-cyan-100 dark:hover:bg-cyan-800/40 active:scale-95 transition-all">
              +{s >= 1000 ? `${s / 1000}k` : s}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* ── WATER ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Droplets size={18} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Water</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{waterGlasses}/{WATER_GLASSES} ly · {waterMl}ml</span>
            </div>
            {/* Glass toggles */}
            <div className="flex gap-1 mt-1.5">
              {Array.from({ length: WATER_GLASSES }, (_, i) => (
                <button key={i} type="button"
                  onClick={async () => {
                    const newGlasses = waterGlasses === i + 1 ? i : i + 1
                    const newMl = newGlasses * GLASS_ML
                    const res = await upsertWater(date, newMl)
                    if (res.error) toast.error(res.error)
                    else {
                      setWaterMl(newMl);
                      onUpdate?.();
                      window.dispatchEvent(new CustomEvent('calsnap:water-updated', { detail: { date, water_ml: newMl } }))
                    }
                  }}
                  className={`flex-1 h-2 rounded-full transition-all ${i < waterGlasses ? 'bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 pl-12 flex-wrap">
          {[150, 250, 500].map((ml) => (
            <button key={ml} onClick={() => addWater(ml)}
              className="px-3.5 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-800/40 active:scale-95 transition-all">
              +{ml}ml
            </button>
          ))}
          <button onClick={() => addWater(-250)}
            className="w-9 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center">
            <Minus size={12} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* ── EXERCISE ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Dumbbell size={18} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Exercise</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{exerciseMinutes}min · {exerciseCalories}kcal</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${exercisePercent}%` }} />
            </div>
          </div>
        </div>
        {editingExercise ? (
          <div className="flex items-center gap-2 pl-12" onClick={(e) => e.stopPropagation()}>
            <input type="number" value={exMinutes} onChange={(e) => setExMinutes(e.target.value)}
              placeholder="Phút" autoFocus
              className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none" />
            <select value={exType} onChange={(e) => setExType(e.target.value as ExerciseType)}
              className="flex-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none">
              <option value="Walking">Walking</option>
              <option value="Running">Running</option>
              <option value="Gym">Gym</option>
              <option value="Cycling">Cycling</option>
            </select>
            <button onClick={handleSaveExercise} className="text-[11px] font-black text-emerald-600">✓</button>
            <button onClick={() => setEditingExercise(false)} className="text-[11px] font-bold text-slate-400">✕</button>
          </div>
        ) : (
          <button onClick={() => { setExMinutes(''); setEditingExercise(true) }}
            className="ml-12 flex items-center gap-1.5 text-[11px] font-bold text-orange-500 hover:text-orange-600 transition-colors w-fit">
            <Plus size={12} /> Log exercise
          </button>
        )}
      </div>
    </div>
  )
}
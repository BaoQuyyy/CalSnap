'use client'

import { useState, useEffect } from 'react'
import { Footprints, Droplets, Dumbbell } from 'lucide-react'
import { upsertSteps, upsertWater, upsertExercise, getDailyHabits, type ExerciseType } from '@/app/actions/habits'
import { toast } from '@/components/toast'

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
}

export function HabitCards({ date, initialHabits }: HabitCardsProps) {
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
  }, [date, initialHabits])

  const waterGlasses = Math.round(waterMl / GLASS_ML)
  const stepsPercent = Math.min(100, (steps / STEPS_GOAL) * 100)
  const waterPercent = Math.min(100, (waterGlasses / WATER_GLASSES) * 100)
  const exercisePercent = Math.min(100, (exerciseMinutes / 30) * 100)

  const openStepsEdit = () => {
    setStepsInput(String(steps))
    setEditingSteps(true)
  }

  const handleSaveSteps = async () => {
    const val = parseInt(stepsInput, 10)
    if (isNaN(val) || val < 0) return
    setEditingSteps(false)
    const res = await upsertSteps(date, val)
    if (res.error) toast.error(res.error)
    else {
      setSteps(val)
      toast.success('Steps updated!')
    }
  }

  const toggleWaterGlass = async (index: number) => {
    const newGlasses = waterGlasses === index + 1 ? index : index + 1
    const newMl = newGlasses * GLASS_ML
    const res = await upsertWater(date, newMl)
    if (res.error) toast.error(res.error)
    else {
      setWaterMl(newMl)
      toast.success('Water updated!')
    }
  }

  const openExerciseEdit = () => {
    setExMinutes('')
    setEditingExercise(true)
  }

  const handleSaveExercise = async () => {
    const mins = parseInt(exMinutes, 10)
    if (isNaN(mins) || mins < 0) return
    setEditingExercise(false)
    const res = await upsertExercise(date, mins, exType)
    if (res.error) toast.error(res.error)
    else {
      const calPerMin = { Walking: 4, Running: 10, Gym: 7, Cycling: 8 }[exType]
      setExerciseMinutes((p) => p + mins)
      setExerciseCalories((p) => p + mins * calPerMin)
      setExMinutes('')
      toast.success('Exercise logged!')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Habits</h3>

      {/* Steps */}
      <div
        className="glass-card rounded-[2rem] p-5 cursor-pointer transition-all duration-300"
        onClick={() => !editingSteps && openStepsEdit()}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-500 flex items-center justify-center">
            <Footprints size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800">Steps</h4>
            {editingSteps ? (
              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 rounded-xl text-sm font-semibold border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSteps()}
                />
                <button
                  onClick={handleSaveSteps}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSteps(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mt-0.5">
                {steps.toLocaleString()} / {STEPS_GOAL.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${stepsPercent}%` }}
          />
        </div>
      </div>

      {/* Water */}
      <div className="glass-card rounded-[2rem] p-5 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Droplets size={22} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800">Water</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              {waterGlasses} / {WATER_GLASSES} glasses
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {Array.from({ length: WATER_GLASSES }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleWaterGlass(i)}
              className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                i < waterGlasses
                  ? 'bg-blue-400 text-white'
                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
              }`}
              aria-label={`Glass ${i + 1}`}
            >
              <Droplets className="w-4 h-4 mx-auto" />
            </button>
          ))}
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${waterPercent}%` }}
          />
        </div>
      </div>

      {/* Exercise */}
      <div
        className="glass-card rounded-[2rem] p-5 cursor-pointer transition-all duration-300"
        onClick={() => !editingExercise && openExerciseEdit()}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Dumbbell size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800">Exercise</h4>
            {editingExercise ? (
              <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={exMinutes}
                    onChange={(e) => setExMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="w-20 px-3 py-1.5 bg-slate-50 rounded-xl text-sm font-semibold border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <select
                    value={exType}
                    onChange={(e) => setExType(e.target.value as ExerciseType)}
                    className="px-3 py-1.5 bg-slate-50 rounded-xl text-sm font-semibold border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Walking">Walking</option>
                    <option value="Running">Running</option>
                    <option value="Gym">Gym</option>
                    <option value="Cycling">Cycling</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveExercise}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingExercise(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mt-0.5">
                {exerciseMinutes} min · {exerciseCalories} cal burned
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${exercisePercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

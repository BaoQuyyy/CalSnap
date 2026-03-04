'use client'

import { cn } from '@/lib/utils'

type MacroType = 'protein' | 'carbs' | 'fat'

const styles: Record<MacroType, string> = {
  protein: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
  carbs: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  fat: 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
}

interface MacroPillProps {
  type: MacroType
  value: number
  unit?: string
  variant?: 'default' | 'light'
  className?: string
}

export function MacroPill({ type, value, unit = 'g', variant = 'default', className }: MacroPillProps) {
  const labels: Record<MacroType, string> = {
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
  }

  const baseStyles = variant === 'light'
    ? 'bg-white/20 text-white border border-white/30'
    : styles[type]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold',
        baseStyles,
        className
      )}
    >
      {value}{unit} {labels[type]}
    </span>
  )
}

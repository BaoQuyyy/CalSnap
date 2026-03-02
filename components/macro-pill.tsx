'use client'

import { cn } from '@/lib/utils'

type MacroType = 'protein' | 'carbs' | 'fat'

const styles: Record<MacroType, string> = {
  protein: 'bg-blue-100 text-blue-600',
  carbs: 'bg-amber-100 text-amber-600',
  fat: 'bg-orange-100 text-orange-600',
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

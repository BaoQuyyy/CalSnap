'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const MIN_YEAR = 2020

interface DatePickerProps {
  value: string // YYYY-MM-DD
  max?: string // YYYY-MM-DD
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
}

export function DatePicker({ value, max, onChange, placeholder = 'Chọn ngày', className, allowClear = false }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  })
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const yearListRef = useRef<HTMLDivElement>(null)

  const maxDate = max ? new Date(max + 'T23:59:59') : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sync viewDate when value prop changes externally
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setViewDate(new Date(y, m - 1, 1))
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowYearPicker(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  // Scroll to selected year when year picker opens
  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const selected = yearListRef.current.querySelector('[data-selected="true"]')
      if (selected) {
        selected.scrollIntoView({ block: 'center' })
      }
    }
  }, [showYearPicker])

  const formatDisplay = (d: string) => {
    if (!d) return placeholder
    const date = new Date(d + 'T12:00:00')
    const ymd = d
    const todayYMD = toYMD(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayYMD = toYMD(yesterday)

    if (ymd === todayYMD) return 'Hôm nay'
    if (ymd === yesterdayYMD) return 'Hôm qua'

    const weekday = DAYS_VI[date.getDay()]
    const [y, m, day] = d.split('-')
    return `${weekday}, ${day.padStart(2, '0')}/${m}/${y}`
  }

  const getCalendarDays = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startPad = first.getDay()
    const daysInMonth = last.getDate()

    const prevMonth = new Date(year, month, 0)
    const prevDays = prevMonth.getDate()
    const rows: { date: Date; isCurrent: boolean; disabled: boolean }[] = []

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevDays - i)
      d.setHours(0, 0, 0, 0)
      rows.push({ date: d, isCurrent: false, disabled: !!maxDate && d > maxDate })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      d.setHours(0, 0, 0, 0)
      rows.push({ date: d, isCurrent: true, disabled: !!maxDate && d > maxDate })
    }
    const remaining = 42 - rows.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      d.setHours(0, 0, 0, 0)
      rows.push({ date: d, isCurrent: false, disabled: !!maxDate && d > maxDate })
    }
    return rows
  }

  const toYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const selectDate = (d: Date, isCurrent: boolean) => {
    if (!isCurrent) return
    if (maxDate && d > maxDate) return
    onChange(toYMD(d))
    setOpen(false)
  }

  const goPrevMonth = () => {
    setSlideDir('right')
    setAnimKey((k) => k + 1)
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  }

  const goNextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1)
    if (maxDate && next > maxDate) return
    setSlideDir('left')
    setAnimKey((k) => k + 1)
    setViewDate(next)
  }

  const selectToday = () => {
    if (maxDate && today > maxDate) return
    onChange(toYMD(today))
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setOpen(false)
  }

  const clearDate = () => {
    onChange('')
    setOpen(false)
  }

  const selectedDate = value ? new Date(value + 'T12:00:00') : null

  // Year range for quick picker
  const currentYear = today.getFullYear()
  const maxYear = maxDate ? maxDate.getFullYear() : currentYear
  const years: number[] = []
  for (let y = MIN_YEAR; y <= maxYear; y++) years.push(y)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  const slideClass = slideDir === 'left'
    ? 'animate-in fade-in slide-in-from-right-4 duration-200'
    : slideDir === 'right'
    ? 'animate-in fade-in slide-in-from-left-4 duration-200'
    : ''

  return (
    <div ref={ref} className={cn('relative overflow-visible', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 border-none"
      >
        <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className={cn('flex-1 text-left', value ? '' : 'text-slate-400 dark:text-slate-500')}>{formatDisplay(value)}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-3 z-[200] overflow-visible bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-2xl border border-slate-200/50 dark:border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 ios-blur -z-10 rounded-[2rem]" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Month/Year button — opens year picker */}
            <button
              type="button"
              onClick={() => setShowYearPicker((v) => !v)}
              className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-white text-base tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {MONTHS_VI[viewDate.getMonth()]} {viewDate.getFullYear()}
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', showYearPicker && 'rotate-180')} />
            </button>

            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Tháng sau"
              disabled={!!(maxDate && new Date(viewDate.getFullYear(), viewDate.getMonth() + 1) > maxDate)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Year/Month quick picker */}
          {showYearPicker && (
            <div
              ref={yearListRef}
              className="mb-4 max-h-48 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="grid grid-cols-4 gap-1 p-2">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    data-selected={y === viewDate.getFullYear()}
                    onClick={() => {
                      setViewDate(new Date(y, viewDate.getMonth(), 1))
                      setShowYearPicker(false)
                    }}
                    className={cn(
                      'py-1.5 px-2 rounded-xl text-sm font-semibold transition-all',
                      y === viewDate.getFullYear()
                        ? 'hoverboard-gradient text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_VI.map((day) => (
              <div key={day} className="text-center text-[11px] font-black text-slate-400 dark:text-slate-500 py-1 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid — direction-aware slide */}
          <div key={animKey} className={cn('grid grid-cols-7 gap-1', slideClass)}>
            {getCalendarDays().map(({ date, isCurrent, disabled }, i) => {
              const isSelected = selectedDate && toYMD(date) === toYMD(selectedDate)
              const isTodayDate = toYMD(date) === toYMD(today)
              const isRecent = isCurrent && date >= sevenDaysAgo && date <= today
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(date, isCurrent)}
                  disabled={disabled || !isCurrent}
                  className={cn(
                    'aspect-square rounded-xl text-sm font-bold transition-all min-w-[38px] min-h-[38px] flex items-center justify-center relative',
                    !isCurrent && 'pointer-events-none opacity-30',
                    disabled && isCurrent && 'opacity-20 cursor-not-allowed',
                    isSelected && 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/25 scale-110 z-10',
                    !isSelected && !disabled && isCurrent && 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200',
                    !isCurrent && !isSelected && 'text-slate-300 dark:text-slate-600',
                    isTodayDate && !isSelected && !disabled && 'text-emerald-600 dark:text-emerald-400',
                    isRecent && !isSelected && !isTodayDate && 'bg-emerald-50/30 dark:bg-emerald-900/20'
                  )}
                >
                  {date.getDate()}
                  {isTodayDate && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            {allowClear ? (
              <button
                type="button"
                onClick={clearDate}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Xóa
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={selectToday}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

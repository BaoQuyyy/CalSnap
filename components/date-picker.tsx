'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'


const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const DAYS_FULL_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const MONTHS_SHORT_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

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
  const [monthPickerMode, setMonthPickerMode] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maxDate = max ? new Date(max + 'T23:59:59') : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sync viewDate when value changes externally (e.g., from 7-day strip)
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setViewDate(new Date(y, m - 1, 1))
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setMonthPickerMode(false)
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

  // Cleanup slide animation timer on unmount
  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    }
  }, [])

  const toYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const formatDisplay = (d: string) => {
    if (!d) return placeholder
    const [y, m, day] = d.split('-')
    const dateObj = new Date(`${y}-${m}-${day}T12:00:00`)
    const weekday = DAYS_FULL_VI[dateObj.getDay()]
    return `${weekday}, ${day}/${m}/${y}`
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

  const selectDate = (d: Date) => {
    if (maxDate && d > maxDate) return
    onChange(toYMD(d))
    setOpen(false)
    setMonthPickerMode(false)
  }

  const goPrevMonth = () => {
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    setSlideDir('right')
    slideTimerRef.current = setTimeout(() => setSlideDir(null), 300)
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  }

  const goNextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1)
    if (maxDate && next > maxDate) return
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    setSlideDir('left')
    slideTimerRef.current = setTimeout(() => setSlideDir(null), 300)
    setViewDate(next)
  }

  const goPrevYear = () => setViewDate((d) => new Date(d.getFullYear() - 1, d.getMonth()))
  const goNextYear = () => {
    const next = new Date(viewDate.getFullYear() + 1, viewDate.getMonth())
    if (maxDate && next > maxDate) return
    setViewDate(next)
  }

  const selectMonth = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1))
    setMonthPickerMode(false)
  }

  const selectToday = () => {
    if (maxDate && today > maxDate) return
    onChange(toYMD(today))
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setOpen(false)
    setMonthPickerMode(false)
  }

  const clearDate = () => {
    onChange('')
    setOpen(false)
    setMonthPickerMode(false)
  }

  const selectedDate = value ? new Date(value + 'T12:00:00') : null
  const isNextMonthDisabled = !!(maxDate && new Date(viewDate.getFullYear(), viewDate.getMonth() + 1) > maxDate)

  const CalendarPanel = (
    <div
      role="dialog"
      aria-label="Chọn ngày"
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[200] bg-white/95 dark:bg-slate-900/95 p-5 shadow-2xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] animate-in fade-in slide-in-from-top-2 duration-200 w-[320px]"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 ios-blur -z-10 rounded-[2rem]" />

      {monthPickerMode ? (
        /* ── MONTH PICKER MODE ── */
        <div>
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={goPrevYear} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" aria-label="Năm trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">{viewDate.getFullYear()}</span>
            <button type="button" onClick={goNextYear} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" aria-label="Năm sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTHS_SHORT_VI.map((m, i) => {
              const isCurrentView = i === viewDate.getMonth()
              const isCurrentMonth = i === today.getMonth() && viewDate.getFullYear() === today.getFullYear()
              const monthStart = new Date(viewDate.getFullYear(), i, 1)
              const isDisabled = !!(maxDate && monthStart > maxDate)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => !isDisabled && selectMonth(i)}
                  disabled={isDisabled}
                  className={cn(
                    'py-2.5 rounded-2xl text-sm font-bold transition-all',
                    isDisabled && 'opacity-30 cursor-not-allowed',
                    isCurrentView && 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/25',
                    !isCurrentView && !isDisabled && 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200',
                    isCurrentMonth && !isCurrentView && 'text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-400/40 ring-inset'
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── CALENDAR MODE ── */
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setMonthPickerMode(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
              aria-label="Chọn tháng và năm"
            >
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                {MONTHS_VI[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
              aria-label="Tháng sau"
              disabled={isNextMonthDisabled}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_VI.map((day, i) => (
              <div
                key={day}
                className={cn(
                  'text-center text-[11px] font-black py-1 uppercase tracking-widest',
                  (i === 0 || i === 6)
                    ? 'text-rose-400/70 dark:text-rose-400/50'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            className={cn(
              'grid grid-cols-7 gap-1 transition-transform duration-200',
              slideDir === 'left' && 'translate-x-[-4px] opacity-90',
              slideDir === 'right' && 'translate-x-[4px] opacity-90'
            )}
          >
            {getCalendarDays().map(({ date, isCurrent, disabled }, i) => {
              const isSelected = selectedDate && toYMD(date) === toYMD(selectedDate)
              const isTodayDate = toYMD(date) === toYMD(today)
              const dayOfWeek = date.getDay()
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !disabled && selectDate(date)}
                  disabled={disabled}
                  className={cn(
                    'aspect-square rounded-xl font-bold transition-all flex items-center justify-center relative',
                    isCurrent ? 'text-sm min-w-[36px] min-h-[36px]' : 'text-xs min-w-[36px] min-h-[36px]',
                    disabled && 'line-through opacity-25 cursor-not-allowed',
                    isSelected && 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/30 scale-105 z-10',
                    !isSelected && !disabled && isCurrent && 'hover:bg-slate-100 dark:hover:bg-white/5',
                    !isSelected && !disabled && isWeekend && isCurrent && 'text-rose-400/80 dark:text-rose-400/60',
                    !isSelected && !disabled && !isWeekend && isCurrent && 'text-slate-700 dark:text-slate-200',
                    !isCurrent && !isSelected && 'text-slate-300 dark:text-slate-600 opacity-50',
                    isTodayDate && !isSelected && !disabled && 'ring-2 ring-emerald-400/50 ring-inset text-emerald-600 dark:text-emerald-400 font-black'
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              {allowClear && value && (
                <button
                  type="button"
                  onClick={clearDate}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Xóa
                </button>
              )}
              {value && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {formatDisplay(value).split(',')[1]?.trim()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={selectToday}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Hôm nay
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (!open) setMonthPickerMode(false); setOpen(!open) }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex w-full items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium',
          'bg-slate-50 dark:bg-slate-800/60',
          'border border-slate-200/60 dark:border-white/10',
          'text-slate-800 dark:text-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
          'transition-all hover:bg-slate-100 dark:hover:bg-slate-700/60',
          open && 'ring-2 ring-emerald-500/20'
        )}
      >
        <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className={cn('flex-1 text-left', !value && 'text-slate-400 dark:text-slate-500')}>
          {formatDisplay(value)}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* Calendar panel */}
      {open && CalendarPanel}
    </div>
  )
}

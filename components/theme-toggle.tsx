'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle({ className = '' }: { className?: string }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => setMounted(true), [])
    if (!mounted) return <div className="w-9 h-9" />

    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center
        bg-slate-100 dark:bg-slate-800
        text-slate-600 dark:text-slate-300
        hover:bg-slate-200 dark:hover:bg-slate-700
        transition-all duration-200 ${className}`}
        >
            <span
                className="absolute inset-0 flex items-center justify-center transition-all duration-300"
                style={{
                    opacity: isDark ? 0 : 1,
                    transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
                }}
            >
                <Sun className="w-4 h-4" />
            </span>
            <span
                className="absolute inset-0 flex items-center justify-center transition-all duration-300"
                style={{
                    opacity: isDark ? 1 : 0,
                    transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
                }}
            >
                <Moon className="w-4 h-4" />
            </span>
        </button>
    )
}

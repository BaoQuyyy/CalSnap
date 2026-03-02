'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

const VISIT_KEY = 'calsnap_visits'
const DISMISS_KEY = 'calsnap_install_dismissed'
const VISITS_THRESHOLD = 3

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Already installed (standalone/PWA)
    if (typeof window !== 'undefined') {
      const nav = navigator as Navigator & { standalone?: boolean }
      const isPWA = window.matchMedia('(display-mode: standalone)').matches
      const isIOSPWA = nav.standalone === true
      if (isPWA || isIOSPWA) {
        setIsStandalone(true)
        return
      }

      // Check if dismissed
      if (localStorage.getItem(DISMISS_KEY)) return

      // Increment visits
      const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1
      localStorage.setItem(VISIT_KEY, String(visits))

      if (visits >= VISITS_THRESHOLD) {
        setShow(true)
      }
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  if (!show || isStandalone) return null

  return (
    <div className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:max-w-sm z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="glass-card rounded-2xl p-4 shadow-lg border border-white/60 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl hoverboard-gradient flex items-center justify-center text-white shrink-0 touch-target">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Add CalSnap to your home screen</p>
          <p className="text-xs text-slate-500 mt-0.5">For the best experience</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-2 -m-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 touch-target flex items-center justify-center shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

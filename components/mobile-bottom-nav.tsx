'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Zap, MessageCircle, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: BookOpen },
  { href: '/scan', label: 'Scan', icon: Zap },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/fitness-plan', label: 'My Plan', icon: ClipboardList },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pt-2 rounded-t-[2rem] bg-slate-900/95 backdrop-blur-2xl border-t border-x border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-stretch justify-around px-2 py-2 gap-0.5 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          const isCenter = href === '/scan'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all min-h-[52px] touch-target',
                isCenter ? 'relative -mt-6' : ''
              )}
              aria-label={label}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl transition-all',
                  isCenter
                    ? 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/30'
                    : isActive
                      ? 'bg-emerald-500/25 text-emerald-400'
                      : 'text-white/60'
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {!isCenter && (
                <span
                  className={cn(
                    'text-[10px] leading-tight',
                    isActive ? 'text-emerald-400' : 'text-white/50'
                  )}
                >
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

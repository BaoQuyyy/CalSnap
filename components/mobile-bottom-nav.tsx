'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Zap, MessageCircle, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/log', label: 'Nhật ký', icon: BookOpen },
  { href: '/scan', label: 'Scan', icon: Zap },
  { href: '/chat', label: 'AI', icon: MessageCircle },
  { href: '/fitness-plan', label: 'Kế hoạch', icon: ClipboardList },
]

import { triggerHaptic, playFeedbackSound } from '@/lib/feedback'

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <>
      {/* Background trắng che vùng safe area phía dưới home indicator iPhone */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white"
        style={{ height: 'env(safe-area-inset-bottom)' }}
      />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        <div className="relative max-w-xs w-full flex justify-center px-4">
          {/* Dark pill - Ultra Premium Glass */}
          <div className="w-full ios-glass ios-shadow rounded-full px-2 py-2 flex items-center justify-around gap-1 border-white/5 dark:border-white/10 relative overflow-visible">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              const isCenter = href === '/scan'

              const handleClick = (e: React.MouseEvent) => {
                triggerHaptic('light')

                if (isActive) {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })

                  // Trigger programmatic refresh with feedback
                  window.dispatchEvent(new CustomEvent('calsnap:trigger-refresh'))
                }
              }

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={handleClick}
                  aria-label={label}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-end h-14 relative ios-tap transition-all',
                    isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full transition-all duration-300',
                      isCenter
                        ? 'w-14 h-14 -mt-10 hoverboard-gradient text-white shadow-lg shadow-emerald-500/25 border-4 border-slate-50 dark:border-slate-900 mb-5'
                        : 'w-8 h-8 mb-1',
                      !isCenter && isActive && 'bg-emerald-500/15'
                    )}
                  >
                    <Icon className={cn(isCenter ? 'h-6 w-6' : 'h-4.5 w-4.5')} />
                  </span>

                  <span className={cn(
                    'text-[10px] whitespace-nowrap font-black uppercase tracking-tighter transition-opacity duration-300 pb-1',
                    isCenter ? 'opacity-0 h-0 w-0 overflow-hidden' : 'opacity-100'
                  )}>
                    {label}
                  </span>

                  {/* Dot indicator for active state (optional but premium) */}
                  {isActive && !isCenter && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
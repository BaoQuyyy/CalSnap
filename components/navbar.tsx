'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/log', label: 'Log' },
  { href: '/scan', label: 'Scan' },
  { href: '/chat', label: 'Chat' },
  { href: '/fitness-plan', label: 'My Plan' },
  { href: '/profile', label: 'Profile' },
]

export function Navbar() {
  const pathname = usePathname()
  const [userInitial, setUserInitial] = useState<string>('')

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          const name = user.user_metadata?.full_name ?? user.email ?? 'U'
          setUserInitial(name[0].toUpperCase())
        }
      })
  }, [])

  return (
    <header className="hidden md:block bg-white/70 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40 border-b border-white/40 dark:border-slate-700/40 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/calsnap-logo.svg" width={36} height={36} alt="CalSnap" />
          <span className="text-xl font-black text-slate-800">CalSnap</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all duration-200',
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/5'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
            {userInitial || '?'}
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-red-500 font-medium"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
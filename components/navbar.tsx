'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Flame, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

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
    <header className="hidden md:block bg-white/70 backdrop-blur sticky top-0 z-40 border-b border-white/40 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl hoverboard-gradient flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Flame className="h-5 w-5" fill="currentColor" />
          </div>
          <span className="text-xl font-black text-slate-800">CalSnap</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                pathname === href
                  ? 'text-emerald-500 font-bold underline underline-offset-4'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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

'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await login(fd)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="glass-card rounded-[3rem] p-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-full hoverboard-gradient flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
          <Zap className="h-7 w-7" fill="currentColor" />
        </div>
      </div>
      <h1 className="text-3xl font-black text-slate-800 text-center mb-1">Welcome back 👋</h1>
      <p className="text-slate-400 text-sm text-center mb-8">Track your nutrition with AI</p>

      {error && (
        <div className="glass-card rounded-2xl p-4 mb-6 bg-red-50/50 border border-red-100">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="sr-only">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                required
                className="pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="sr-only">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                className="pl-12 pr-12 py-3 bg-slate-50 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 touch-target"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full mt-6 hoverboard-gradient text-white font-bold rounded-2xl py-4 min-h-[44px] active:scale-95 transition-all touch-target"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
        <p className="text-sm text-slate-500 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-emerald-500 font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}

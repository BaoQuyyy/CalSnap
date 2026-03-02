'use client'

import { useState } from 'react'
import { register } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm_password') as HTMLInputElement).value
    if (password !== confirm) {
      setError('Passwords do not match')
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    const fd = new FormData(form)
    const result = await register(fd)
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
      <h1 className="text-3xl font-black text-slate-800 text-center mb-1">Create Account ✨</h1>
      <p className="text-slate-400 text-sm text-center mb-8">Track your nutrition with AI</p>

      {error && (
        <div className="glass-card rounded-2xl p-4 mb-6 bg-red-50/50 border border-red-100">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="full_name" className="sr-only">Full Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Full Name"
                required
                className="pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
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
                placeholder="Password (min 6 characters)"
                minLength={6}
                required
                className="pl-12 pr-12 py-3 bg-slate-50 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm_password" className="sr-only">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                minLength={6}
                required
                className="pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full mt-6 hoverboard-gradient text-white font-bold rounded-2xl py-4 active:scale-95 transition-all"
          disabled={loading}
        >
          {loading ? 'Creating…' : 'Create Account'}
        </Button>
        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-500 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

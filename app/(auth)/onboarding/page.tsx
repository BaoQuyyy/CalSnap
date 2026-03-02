'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboarding, type OnboardingData } from '@/app/actions/onboarding'
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'

type Step = 1 | 2 | 3

const activityOptions = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, no exercise' },
  { value: 'light', label: 'Lightly Active', desc: '1–3 days/week' },
  { value: 'moderate', label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'active', label: 'Very Active', desc: '6–7 days/week' },
  { value: 'very_active', label: 'Athlete', desc: '2x/day training' },
]

const goalOptions = [
  { value: 'lose_weight', label: 'Lose Weight', icon: '🔥', desc: 'Burn fat and get lean' },
  { value: 'maintain', label: 'Maintain Weight', icon: '⚖️', desc: 'Stay healthy and fit' },
  { value: 'gain_muscle', label: 'Gain Muscle', icon: '💪', desc: 'Build strength and mass' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    gender: '' as 'male' | 'female' | '',
    age: '',
    height_cm: '170',
    weight_kg: '70',
    goal: '' as 'lose_weight' | 'maintain' | 'gain_muscle' | '',
    target_weight_kg: '65',
    activity_level: '' as OnboardingData['activity_level'] | '',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleNext = () => {
    if (step === 1 && (!form.gender || !form.age || !form.height_cm || !form.weight_kg)) {
      setError('Please fill in all fields'); return
    }
    if (step === 2 && (!form.goal || !form.activity_level)) {
      setError('Please select your goal and activity level'); return
    }
    setError('')
    setStep(s => (s + 1) as Step)
  }

  const handleSubmit = async () => {
    setStep(3)
    setLoading(true)
    const result = await saveOnboarding({
      gender: form.gender as 'male' | 'female',
      age: parseInt(form.age),
      height_cm: parseFloat(form.height_cm),
      weight_kg: parseFloat(form.weight_kg),
      target_weight_kg: parseFloat(form.target_weight_kg),
      goal: form.goal as OnboardingData['goal'],
      activity_level: form.activity_level as OnboardingData['activity_level'],
    })
    setLoading(false)
    if ((result as any)?.error) { setError((result as any).error); setStep(2); return }
    router.push('/fitness-plan')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="glass-card rounded-[3rem] p-10 w-full max-w-lg mx-auto">

        {/* Progress dots */}
        {step !== 3 && (
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2].map(dot => (
              <div key={dot} className={`h-2.5 rounded-full transition-all duration-300 ${
                dot === step ? 'w-8 bg-emerald-500' : dot < step ? 'w-2.5 bg-emerald-300' : 'w-2.5 bg-slate-200'
              }`} />
            ))}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-black text-slate-800 mb-1">Let&apos;s get to know you 👋</h1>
            <p className="text-slate-400 text-sm mb-8">Tell us about yourself to personalize your plan.</p>

            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Gender</label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => set('gender', g)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all font-semibold text-sm ${
                      form.gender === g ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                    }`}>
                    <span className="text-2xl">{g === 'male' ? '👨' : '👩'}</span>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Age</label>
              <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="25"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-400" />
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Height — <span className="text-emerald-500">{form.height_cm} cm</span>
              </label>
              <input type="range" min="140" max="220" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} className="w-full accent-emerald-500 mb-2" />
              <input type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-400" />
            </div>

            <div className="mb-8">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Current Weight — <span className="text-emerald-500">{form.weight_kg} kg</span>
              </label>
              <input type="range" min="40" max="200" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} className="w-full accent-emerald-500 mb-2" />
              <input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-400" />
            </div>

            {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}
            <button onClick={handleNext} className="w-full hoverboard-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              Next <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-black text-slate-800 mb-1">What&apos;s your goal? 🎯</h1>
            <p className="text-slate-400 text-sm mb-8">We&apos;ll build your plan around this.</p>

            <div className="flex flex-col gap-3 mb-6">
              {goalOptions.map(g => (
                <button key={g.value} onClick={() => set('goal', g.value)}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-left ${
                    form.goal === g.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}>
                  <span className="text-3xl">{g.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800">{g.label}</p>
                    <p className="text-xs text-slate-400">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {form.goal && form.goal !== 'maintain' && (
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Target Weight — <span className="text-emerald-500">{form.target_weight_kg} kg</span>
                </label>
                <input type="range" min="40" max="200" value={form.target_weight_kg} onChange={e => set('target_weight_kg', e.target.value)} className="w-full accent-emerald-500 mb-2" />
                <input type="number" value={form.target_weight_kg} onChange={e => set('target_weight_kg', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-400" />
              </div>
            )}

            <div className="mb-8">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Activity Level</label>
              <div className="flex flex-wrap gap-2">
                {activityOptions.map(a => (
                  <button key={a.value} onClick={() => set('activity_level', a.value)} title={a.desc}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all border-2 ${
                      form.activity_level === a.value ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {form.activity_level && (
                <p className="text-xs text-slate-400 mt-2">{activityOptions.find(a => a.value === form.activity_level)?.desc}</p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold flex items-center gap-2">
                <ChevronLeft size={18} /> Back
              </button>
              <button onClick={handleSubmit} className="flex-1 hoverboard-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                Generate My Plan <Sparkles size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Loading */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full hoverboard-gradient flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles size={40} className="text-white animate-pulse" fill="currentColor" />
              </div>
              <div className="absolute inset-0 rounded-full hoverboard-gradient opacity-30 animate-ping" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Creating your personalized plan ✨</h2>
            <p className="text-slate-400 text-sm text-center">AI is analyzing your profile...<br />This takes just a moment.</p>
            <div className="flex gap-1.5 mt-8">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            {!loading && error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}


'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveMeal } from '@/app/actions/meals'
import { Camera, ImageIcon, Loader2, Flame, Beef, Wheat, Droplets, CheckCircle, AlertCircle, RotateCcw, Pencil } from 'lucide-react'
import { toast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { NutritionResult } from '@/lib/types'

type State = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

export default function ScanPage() {
    const [state, setState] = useState<State>('idle')
    const [imageData, setImageData] = useState<string | null>(null)
    const [result, setResult] = useState<NutritionResult | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Editable fields
    const [editFoodName, setEditFoodName] = useState('')
    const [editCalories, setEditCalories] = useState(0)
    const [editProtein, setEditProtein] = useState(0)
    const [editCarbs, setEditCarbs] = useState(0)
    const [editFat, setEditFat] = useState(0)

    const cameraInputRef = useRef<HTMLInputElement>(null)
    const galleryInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            setImageData(reader.result as string)
            setState('preview')
            setSaved(false)
            setResult(null)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) handleFile(file)
    }

    // Resize anh truoc khi gui len API - tranh timeout tren mobile
    const resizeImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
        return new Promise((resolve) => {
            const img = document.createElement('img')
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const scale = Math.min(1, maxWidth / img.width)
                canvas.width = img.width * scale
                canvas.height = img.height * scale
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/jpeg', 0.8))
            }
            img.src = dataUrl
        })
    }

    const analyze = async () => {
        if (!imageData) return
        setState('analyzing')
        setErrorMsg(null)

        try {
            // Resize anh truoc khi gui - giam size tu ~5MB xuong ~200KB
            const resized = await resizeImage(imageData, 800)

            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: resized }),
            })
            const data = await res.json()

            if (data.error) {
                setErrorMsg(data.error)
                setState('error')
            } else {
                setResult(data.result)
                // Init editable fields với AI result
                setEditFoodName(data.result.foodName)
                setEditCalories(data.result.calories)
                setEditProtein(data.result.protein)
                setEditCarbs(data.result.carbs)
                setEditFat(data.result.fat)
                setState('result')
            }
        } catch {
            setErrorMsg('Failed to connect to AI service. Please try again.')
            setState('error')
        }
    }

    const handleSave = async () => {
        if (!result) return
        setSaving(true)
        // Dùng edited values thay vì result gốc
        const res = await saveMeal({
            foodName: editFoodName || result.foodName,
            calories: Number(editCalories) || result.calories,
            protein: Number(editProtein) || 0,
            carbs: Number(editCarbs) || 0,
            fat: Number(editFat) || 0,
        })
        setSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            setSaved(true)
            toast.success('Saved to your log!')
            setTimeout(() => router.push('/log'), 1500)
        }
    }

    const reset = () => {
        setState('idle')
        setImageData(null)
        setResult(null)
        setErrorMsg(null)
        setSaved(false)
        if (cameraInputRef.current) cameraInputRef.current.value = ''
        if (galleryInputRef.current) galleryInputRef.current.value = ''
    }

    const confidenceColor = {
        high: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        medium: 'bg-amber-100 text-amber-600 border-amber-200',
        low: 'bg-red-100 text-red-600 border-red-200',
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto min-w-0 overflow-x-hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Scan Food</h1>
                <p className="text-slate-500 text-sm mt-0.5">Upload a photo to get instant nutrition analysis</p>
            </div>

            {/* Image Upload / Preview */}
            <div className="glass-card rounded-[2rem] overflow-hidden border border-white/40">
                {!imageData ? (
                    <div
                        className="flex flex-col items-center justify-center min-h-[200px] h-64 gap-4 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 m-2"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600">
                            <Camera className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-slate-800">Chup anh hoac chon tu thu vien</p>
                            <p className="text-sm text-slate-500 mt-1">JPG, PNG, WEBP</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl hoverboard-gradient text-white font-semibold text-sm min-h-[44px] touch-target transition-all active:scale-95"
                            >
                                <Camera className="h-5 w-5" />
                                Chup anh
                            </button>
                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm min-h-[44px] touch-target hover:bg-slate-200 transition-all active:scale-95"
                            >
                                <ImageIcon className="h-5 w-5" />
                                Thu vien anh
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">hoac keo tha anh vao day</p>
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                            className="hidden" onChange={handleFileInput} aria-label="Chup anh mon an" />
                        <input ref={galleryInputRef} type="file" accept="image/*"
                            className="hidden" onChange={handleFileInput} aria-label="Chon anh tu thu vien" />
                    </div>
                ) : (
                    <div className="relative p-2">
                        <div className="relative h-64 w-full rounded-2xl overflow-hidden">
                            <Image src={imageData} alt="Food preview" fill className="object-cover" unoptimized />
                            {state === 'analyzing' && (
                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center space-y-3 text-white">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
                                        <p className="text-sm font-medium">Analyzing with AI...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="icon"
                            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl touch-target flex items-center justify-center"
                            onClick={reset} aria-label="Remove image">
                            <RotateCcw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                )}
            </div>

            {state === 'preview' && (
                <Button className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-4 min-h-[44px] shadow-lg shadow-emerald-500/25 touch-target"
                    size="lg" onClick={analyze}>
                    <Camera className="h-5 w-5" />
                    Analyze with AI
                </Button>
            )}

            {state === 'error' && (
                <div className="glass-card rounded-[2rem] p-6 border border-red-100 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-red-700">{errorMsg}</p>
                            <Button variant="ghost" size="sm" className="mt-2 text-slate-600" onClick={() => setState('preview')}>
                                Try again
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {state === 'result' && result && (
                <div className="glass-card rounded-[2rem] p-6 border border-white/40">

                    {/* Confidence badge */}
                    <div className="flex justify-end mb-3">
                        <Badge variant="outline" className={confidenceColor[result.confidence]}>
                            {result.confidence} confidence
                        </Badge>
                    </div>

                    {/* EDITABLE food name */}
                    <div className="flex items-center gap-2 mb-4">
                        <Pencil className="h-4 w-4 text-emerald-400 shrink-0" />
                        <input
                            type="text"
                            value={editFoodName}
                            onChange={(e) => setEditFoodName(e.target.value)}
                            placeholder="Enter food name..."
                            className="text-xl font-black text-slate-800 bg-transparent border-b-2 border-emerald-300 focus:border-emerald-500 outline-none w-full pb-0.5"
                        />
                    </div>

                    {/* EDITABLE calories */}
                    <div className="flex items-center gap-2 mb-5 p-3 bg-slate-50 rounded-2xl">
                        <Flame className="h-5 w-5 text-emerald-500 shrink-0" />
                        <input
                            type="number"
                            value={editCalories}
                            onChange={(e) => setEditCalories(Number(e.target.value))}
                            min={0}
                            className="text-2xl font-black text-slate-800 bg-transparent outline-none w-24"
                        />
                        <span className="text-base font-normal text-slate-500">kcal</span>
                    </div>

                    {/* EDITABLE macros */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <EditableMacro
                            icon={Beef} label="Protein" value={editProtein}
                            onChange={setEditProtein} color="text-blue-500" bg="bg-blue-100"
                        />
                        <EditableMacro
                            icon={Wheat} label="Carbs" value={editCarbs}
                            onChange={setEditCarbs} color="text-amber-600" bg="bg-amber-100"
                        />
                        <EditableMacro
                            icon={Droplets} label="Fat" value={editFat}
                            onChange={setEditFat} color="text-orange-500" bg="bg-orange-100"
                        />
                    </div>

                    {/* AI disclaimer nếu confidence thấp */}
                    {result.confidence === 'low' && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
                            ⚠️ AI khong chac chan ve mon an nay. Vui long kiem tra va chinh sua thong tin truoc khi luu.
                        </p>
                    )}

                    {!saved ? (
                        <Button className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-3.5"
                            onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                            ) : (
                                <>Save to Log</>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
                            <CheckCircle className="h-5 w-5" />
                            Saved to your log!
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function EditableMacro({
    icon: Icon, label, value, onChange, color, bg,
}: {
    icon: React.ElementType
    label: string
    value: number
    onChange: (v: number) => void
    color: string
    bg: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className={`p-1.5 rounded-xl ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
                min={0}
                className="text-base font-black text-slate-800 bg-transparent outline-none w-full text-center border-b border-slate-200 focus:border-emerald-400"
            />
            <span className="text-[10px] text-slate-400">g {label}</span>
        </div>
    )
}

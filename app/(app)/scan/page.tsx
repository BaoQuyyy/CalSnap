'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveMeal } from '@/app/actions/meals'
import { Camera, ImageIcon, Loader2, Flame, Beef, Wheat, Droplets, CheckCircle, AlertCircle, RotateCcw, Pencil, Sparkles } from 'lucide-react'
import { toast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { NutritionResult, AnalyzeResponse } from '@/lib/types'

type State = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

const LOCAL_SCAN_KEY = 'calsnap_last_scan_v1'

export default function ScanPage() {
    const [state, setState] = useState<State>('idle')
    const [imageData, setImageData] = useState<string | null>(null)
    const [result, setResult] = useState<NutritionResult | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [analyzingProgress, setAnalyzingProgress] = useState(0)

    // AI Portion Assistant
    const [portionInput, setPortionInput] = useState('')
    const [portionLoading, setPortionLoading] = useState(false)

    // Image visibility timer
    const [scanTime, setScanTime] = useState<Date | null>(null)
    const [imageVisible, setImageVisible] = useState(true)

    // Editable fields
    const [editFoodName, setEditFoodName] = useState('')
    const [editCalories, setEditCalories] = useState(0)
    const [editProtein, setEditProtein] = useState(0)
    const [editCarbs, setEditCarbs] = useState(0)
    const [editFat, setEditFat] = useState(0)

    const cameraInputRef = useRef<HTMLInputElement>(null)
    const galleryInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFile = useCallback(async (file: File) => {
        const reader = new FileReader()
        reader.onloadend = async () => {
            const raw = reader.result as string
            try {
                const resized = await resizeImage(raw, 800)
                setImageData(resized)
            } catch {
                setImageData(raw)
            }
            setState('preview')
            setSaved(false)
            setResult(null)
            setScanTime(null)
            setImageVisible(true)
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
                resolve(canvas.toDataURL('image/jpeg', 0.7))
            }
            img.src = dataUrl
        })
    }

    const analyze = async () => {
        if (!imageData) return
        setState('analyzing')
        setErrorMsg(null)
        setAnalyzingProgress(0)

        // Fake progress: creep up to 90% while waiting
        const startTime = Date.now()
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime
            // Exponential slow-down: fast at first, then plateaus near 90%
            const pct = 90 * (1 - Math.exp(-elapsed / 4000))
            setAnalyzingProgress(Math.min(90, pct))
        }, 100)

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData }),
            })
            const data = await res.json()

            if (data.error) {
                setErrorMsg(data.error)
                setState('error')
            } else {
                setResult(data.result)
                setEditFoodName(data.result.foodName)
                setEditCalories(data.result.calories)
                setEditProtein(data.result.protein)
                setEditCarbs(data.result.carbs)
                setEditFat(data.result.fat)
                setAnalyzingProgress(100)
                setState('result')
            }
        } catch {
            setErrorMsg('Failed to connect to AI service. Please try again.')
            setState('error')
        } finally {
            clearInterval(progressInterval)
        }
    }

    const handleSave = async () => {
        if (!result) return
        setSaving(true)
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
            const mealId = (res as any).data?.id
            toast.success('Đã lưu vào nhật ký!', {
                onClick: () => {
                    if (mealId) {
                        router.push(`/log?highlight=${mealId}`)
                    }
                }
            })
            window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
                detail: {
                    date: new Date().toISOString().split('T')[0],
                    mealId: mealId
                }
            }))
            setTimeout(() => router.push('/log'), 1500)
        }
    }

    const reset = () => {
        setState('idle')
        setImageData(null)
        setResult(null)
        setErrorMsg(null)
        setSaved(false)
        setScanTime(null)
        setImageVisible(true)
        if (cameraInputRef.current) cameraInputRef.current.value = ''
        if (galleryInputRef.current) galleryInputRef.current.value = ''
        window.localStorage.removeItem(LOCAL_SCAN_KEY) // Xóa cache khi reset chủ động
    }

    useEffect(() => {
        if (!result) return
        setScanTime((prev) => prev ?? new Date())
        const timer = setTimeout(() => setImageVisible(false), 5 * 60 * 1000)
        return () => clearTimeout(timer)
    }, [result])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!result) return // KHÔNG tự xóa ở đây, chỉ save khi có kết quả

        const saveToCache = async () => {
            let optimizedImage = imageData
            // Nén ảnh nếu dung lượng lớn (base64 length > ~500kb)
            if (imageData && imageData.length > 500000) {
                try {
                    optimizedImage = await compressImage(imageData, 800)
                } catch (e) {
                    console.error('Compression failed', e)
                }
            }

            const payload = {
                result,
                editFoodName,
                editCalories,
                editProtein,
                editCarbs,
                editFat,
                imageData: optimizedImage,
                savedAt: new Date().toISOString()
            }
            try { window.localStorage.setItem(LOCAL_SCAN_KEY, JSON.stringify(payload)) } catch (e) {
                console.warn('LocalStorage save failed (likely quota)', e)
            }
        }
        saveToCache()
    }, [result, editFoodName, editCalories, editProtein, editCarbs, editFat, imageData])

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const raw = window.localStorage.getItem(LOCAL_SCAN_KEY)
            if (!raw) return
            const data = JSON.parse(raw) as {
                result: NutritionResult
                editFoodName: string
                editCalories: number
                editProtein: number
                editCarbs: number
                editFat: number
                imageData?: string
                savedAt: string
            }
            if ((Date.now() - new Date(data.savedAt).getTime()) / 60000 > 5) {
                window.localStorage.removeItem(LOCAL_SCAN_KEY); return
            }
            setResult(data.result)
            setEditFoodName(data.editFoodName)
            setEditCalories(data.editCalories)
            setEditProtein(data.editProtein)
            setEditCarbs(data.editCarbs)
            setEditFat(data.editFat)
            if (data.imageData) setImageData(data.imageData)
            setState('result')
            setImageVisible(true) // Khi phục hồi từ cache thì hiện ảnh luôn
        } catch { }
    }, [])

    const adjustPortion = async (adjustment: string) => {
        if (!result || !adjustment.trim()) return
        setPortionLoading(true)
        try {
            const description = `Bữa ăn hiện tại: "${editFoodName || result.foodName}" với ${editCalories || result.calories} kcal, protein ${editProtein || result.protein}g, carbs ${editCarbs || result.carbs}g, fat ${editFat || result.fat}g.
Người dùng muốn điều chỉnh/thêm: "${adjustment}". Hãy tính lại toàn bộ dinh dưỡng cho bữa ăn sau khi điều chỉnh.`
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textOnly: true, foodNameHint: description }),
            })
            const data: AnalyzeResponse = await res.json()
            if (data.error || !data.result) { toast.error(data.error ?? 'AI không thể tính lại, thử lại sau.'); return }
            const updated = data.result
            setResult(updated)
            setEditFoodName(updated.foodName)
            setEditCalories(updated.calories)
            setEditProtein(updated.protein)
            setEditCarbs(updated.carbs)
            setEditFat(updated.fat)
        } catch { toast.error('Không gọi được AI.') }
        finally { setPortionLoading(false); setPortionInput('') }
    }

    const confidenceMeta = {
        high: { label: 'Độ tin cậy cao', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        medium: { label: 'Độ tin cậy TB', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
        low: { label: 'Độ tin cậy thấp', cls: 'bg-red-50 text-red-500 border-red-200' },
    } as const

    return (
        <div className="space-y-5 max-w-lg mx-auto overflow-x-hidden page-enter pb-8">

            {/* ── HEADER ── */}
            <div className="nutri-header rounded-[2rem] overflow-hidden">
                <div className="relative z-10 px-5 md:px-8 pt-12 pb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">📸</div>
                        <div>
                            <h1 className="text-white text-2xl font-display font-extrabold leading-tight">Scan món ăn</h1>
                            <p className="text-white/70 text-xs font-medium mt-0.5">AI nhận diện & ước tính dinh dưỡng</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── UPLOAD CARD ── */}
            <div className="glass-card rounded-[2rem] p-5 space-y-4">

                {/* Image preview */}
                {imageData && imageVisible && (
                    <div className="relative rounded-[1.5rem] overflow-hidden">
                        <div className="relative h-60 w-full">
                            <Image src={imageData} alt="Food preview" fill className="object-cover" unoptimized />
                            {state === 'analyzing' && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                                    </div>
                                    <p className="text-white text-sm font-semibold">Đang phân tích...</p>
                                    <p className="text-white/50 text-xs">AI đang nhận diện món ăn</p>
                                    {/* Progress bar */}
                                    <div className="w-36 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                                            style={{ width: `${analyzingProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-white/40 text-[10px]">{Math.round(analyzingProgress)}%</p>
                                </div>
                            )}
                        </div>
                        <button onClick={reset}
                            className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-full flex items-center justify-center transition-all">
                            <RotateCcw className="h-4 w-4 text-white" />
                        </button>
                    </div>
                )}

                {/* Drop zone */}
                {!imageData && (
                    <div
                        className="flex flex-col items-center justify-center min-h-[160px] gap-3 rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <Camera className="h-7 w-7 text-emerald-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-700 text-sm">Chụp ảnh hoặc chọn từ thư viện</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · Thả ảnh vào đây</p>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm cursor-pointer transition-all ${result ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/20'
                        }`}>
                        <Camera className="h-4 w-4" />
                        {result ? 'Chụp lại' : 'Chụp ảnh'}
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} aria-label="Chụp ảnh món ăn" />
                    </label>
                    <label className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm cursor-pointer bg-slate-900 text-white hover:bg-slate-800 transition-all">
                        <ImageIcon className="h-4 w-4" />
                        Thư viện
                        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} aria-label="Chọn ảnh từ thư viện" />
                    </label>
                </div>
            </div>

            {/* ── ANALYZE BUTTON ── */}
            {state === 'preview' && (
                <button onClick={analyze}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white hoverboard-gradient shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]">
                    <Sparkles className="h-5 w-5" />
                    Phân tích với AI
                </button>
            )}

            {/* ── ERROR ── */}
            {state === 'error' && (
                <div className="glass-card rounded-[2rem] p-5 bg-red-50/80 border border-red-100">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-red-700 mb-1">Có lỗi xảy ra</p>
                            <p className="text-xs text-red-500">{errorMsg}</p>
                            <button onClick={() => setState('preview')}
                                className="mt-3 px-4 py-2 rounded-xl bg-red-100 text-red-600 font-semibold text-xs hover:bg-red-200 transition-colors">
                                Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RESULT ── */}
            {state === 'result' && result && (
                <div className="glass-card rounded-[2rem] p-5 space-y-5">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kết quả phân tích</p>
                        <Badge variant="outline" className={confidenceMeta[result.confidence].cls}>
                            {confidenceMeta[result.confidence].label}
                        </Badge>
                    </div>

                    {/* Food name */}
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Pencil className="h-4 w-4 text-emerald-400 shrink-0" />
                        <input
                            type="text"
                            value={editFoodName}
                            onChange={(e) => setEditFoodName(e.target.value)}
                            placeholder="Tên món ăn..."
                            className="text-lg font-black text-slate-800 dark:text-slate-100 bg-transparent outline-none w-full"
                        />
                    </div>

                    {/* Calories */}
                    <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-2xl p-4 border border-emerald-100/50 dark:border-emerald-500/20">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Flame className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <input
                                type="number"
                                value={editCalories}
                                onChange={(e) => setEditCalories(Number(e.target.value))}
                                min={0}
                                className="text-5xl font-black text-slate-800 dark:text-white bg-transparent outline-none w-32 tabular-nums"
                            />
                            <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">kcal</span>
                        </div>
                    </div>

                    {/* Macros — dùng EditableMacro */}
                    <div className="grid grid-cols-3 gap-3">
                        <EditableMacro icon={Beef} label="Protein" value={editProtein} onChange={setEditProtein} color="text-blue-500" bg="bg-blue-50" />
                        <EditableMacro icon={Wheat} label="Carbs" value={editCarbs} onChange={setEditCarbs} color="text-amber-500" bg="bg-amber-50" />
                        <EditableMacro icon={Droplets} label="Fat" value={editFat} onChange={setEditFat} color="text-orange-500" bg="bg-orange-50" />
                    </div>

                    {/* Low confidence warning */}
                    {result.confidence === 'low' && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
                            <span className="text-sm">⚠️</span>
                            <p className="text-xs text-amber-700 font-medium">AI không chắc chắn — hãy kiểm tra lại trước khi lưu nhé.</p>
                        </div>
                    )}

                    {/* AI Portion Assistant */}
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-base shrink-0">🤖</div>
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Điều chỉnh khẩu phần</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">AI sẽ tính lại dinh dưỡng cho bạn</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(result.suggestions && result.suggestions.length > 0
                                ? result.suggestions
                                : ['Thêm 1 ly sữa đậu nành', 'Tô lớn hơn', 'Ít cơm hơn']
                            ).map((s) => (
                                <button key={s} type="button" onClick={() => adjustPortion(s)} disabled={portionLoading}
                                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-60 transition-colors shadow-sm">
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                value={portionInput}
                                onChange={(e) => setPortionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && adjustPortion(portionInput)}
                                placeholder="Nhập thêm món... (vd: thêm trứng)"
                                className="flex-1 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/30 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            />
                            <button type="button" onClick={() => adjustPortion(portionInput)}
                                disabled={portionLoading || !portionInput.trim()}
                                className="w-9 h-9 rounded-xl hoverboard-gradient flex items-center justify-center text-white text-xs font-bold disabled:opacity-60 shrink-0">
                                {portionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : '→'}
                            </button>
                        </div>
                    </div>

                    {/* Save */}
                    {!saved ? (
                        <button onClick={handleSave} disabled={saving}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white hoverboard-gradient shadow-lg shadow-emerald-500/20 disabled:opacity-70 transition-all active:scale-[0.98]">
                            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</> : 'Lưu vào nhật ký'}
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 font-bold">
                            <CheckCircle className="h-5 w-5" />
                            Đã lưu vào nhật ký!
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
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 flex flex-col items-center gap-2 shadow-sm transition-all hover:border-emerald-500/30 group">
            <div className={`w-9 h-9 rounded-xl ${bg} dark:bg-emerald-500/10 flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div className="flex flex-col items-center">
                <div className="relative group/input">
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
                        min={0}
                        className={`w-16 text-center text-xl font-black ${color} bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1 px-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums border border-transparent focus:border-emerald-500/30`}
                    />
                    <span className="absolute -right-4 bottom-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">g</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{label}</p>
            </div>
        </div>
    )
}

/**
 * Nén ảnh bằng Canvas để tiết kiệm localStorage (giới hạn 5MB)
 */
async function compressImage(base64: string, maxWidth: number): Promise<string> {
    if (typeof window === 'undefined') return base64
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        img.src = base64
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
                height = (height * maxWidth) / width
                width = maxWidth
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(base64)

            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.7)) // Nén thành JPEG 70%
        }
        img.onerror = reject
    })
}
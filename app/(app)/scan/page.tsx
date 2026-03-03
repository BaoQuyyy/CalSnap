'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveMeal } from '@/app/actions/meals'
import { Camera, ImageIcon, Loader2, Flame, Beef, Wheat, Droplets, CheckCircle, AlertCircle, RotateCcw, Pencil } from 'lucide-react'
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

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            setImageData(reader.result as string)
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
        setScanTime(null)
        setImageVisible(true)
        if (cameraInputRef.current) cameraInputRef.current.value = ''
        if (galleryInputRef.current) galleryInputRef.current.value = ''
    }

    // Ẩn ảnh sau 5 phút kể từ khi có kết quả
    useEffect(() => {
        if (!result) return
        setScanTime((prev) => prev ?? new Date())
        const timer = setTimeout(() => {
            setImageVisible(false)
        }, 5 * 60 * 1000)
        return () => clearTimeout(timer)
    }, [result])

    // Lưu kết quả scan cuối cùng vào localStorage để tránh phải gọi lại AI
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!result) {
            window.localStorage.removeItem(LOCAL_SCAN_KEY)
            return
        }
        const payload = {
            result,
            editFoodName,
            editCalories,
            editProtein,
            editCarbs,
            editFat,
            savedAt: new Date().toISOString(),
        }
        try {
            window.localStorage.setItem(LOCAL_SCAN_KEY, JSON.stringify(payload))
        } catch {
            // ignore
        }
    }, [result, editFoodName, editCalories, editProtein, editCarbs, editFat])

    // Khôi phục kết quả scan gần nhất khi mở lại trang
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
                savedAt: string
            }
            // Giới hạn thời gian giữ, ví dụ 24h
            const savedAt = new Date(data.savedAt)
            const diffHours = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)
            if (diffHours > 24) {
                window.localStorage.removeItem(LOCAL_SCAN_KEY)
                return
            }
            setResult(data.result)
            setEditFoodName(data.editFoodName)
            setEditCalories(data.editCalories)
            setEditProtein(data.editProtein)
            setEditCarbs(data.editCarbs)
            setEditFat(data.editFat)
            setState('result')
            setImageVisible(false)
        } catch {
            // ignore
        }
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
                body: JSON.stringify({
                    textOnly: true,
                    foodNameHint: description,
                }),
            })

            const data: AnalyzeResponse = await res.json()
            if (data.error || !data.result) {
                console.error('Adjust portion API error:', data.error)
                toast.error(data.error ?? 'AI không thể tính lại khẩu phần, thử lại sau.')
                return
            }

            const updated = data.result
            setResult(updated)
            setEditFoodName(updated.foodName)
            setEditCalories(updated.calories)
            setEditProtein(updated.protein)
            setEditCarbs(updated.carbs)
            setEditFat(updated.fat)
        } catch (e) {
            console.error('Adjust portion error:', e)
            toast.error('Không gọi được AI để tính lại khẩu phần.')
        } finally {
            setPortionLoading(false)
            setPortionInput('')
        }
    }

    const confidenceColor = {
        high: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        medium: 'bg-amber-100 text-amber-600 border-amber-200',
        low: 'bg-red-100 text-red-600 border-red-200',
    } as const

    const confidenceLabel: Record<NutritionResult['confidence'], string> = {
        high: 'Độ tin cậy cao',
        medium: 'Độ tin cậy trung bình',
        low: 'Độ tin cậy thấp',
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto min-w-0 overflow-x-hidden page-enter">
            {/* NutriAI header */}
            <div className="-mx-4 md:-mx-8 nutri-header">
                <div className="relative z-10 px-5 md:px-8 pt-12 pb-6">
                    <h1 className="text-white text-2xl md:text-3xl font-display font-extrabold">
                        Chụp ảnh món ăn 📸
                    </h1>
                    <p className="text-white/75 text-sm mt-1">
                        AI nhận diện món ăn và ước tính dinh dưỡng ngay lập tức.
                    </p>
                </div>
            </div>

            {/* Image Upload / Preview */}
            <div className="glass-card rounded-[2rem] overflow-hidden border border-white/40 p-4 space-y-4">
                {imageData && imageVisible && (
                    <div className="relative rounded-[1.75rem] overflow-hidden">
                        <div className="relative h-64 w-full">
                            <Image src={imageData} alt="Food preview" fill className="object-cover" unoptimized />
                            {state === 'analyzing' && (
                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                                    <div className="text-center space-y-3 text-white">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
                                        <p className="text-sm font-medium">Đang phân tích bằng AI...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="icon"
                            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full touch-target flex items-center justify-center"
                            onClick={reset} aria-label="Remove image">
                            <RotateCcw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                )}

                {!imageData && (
                    <div
                        className="flex flex-col items-center justify-center min-h-[180px] gap-4 rounded-[1.75rem] border-2 border-dashed border-slate-200"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600">
                            <Camera className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-slate-800">Chụp ảnh hoặc chọn từ thư viện</p>
                            <p className="text-sm text-slate-500 mt-1">JPG, PNG, WEBP</p>
                        </div>
                        <p className="text-xs text-slate-400">hoặc thả ảnh vào đây</p>
                    </div>
                )}

                {/* Nút camera + gallery luôn hiển thị */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <label
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-sm min-h-[44px] touch-target cursor-pointer transition-colors ${
                            result ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'hoverboard-gradient text-white'
                        }`}
                    >
                        <Camera className="h-5 w-5" />
                        {result ? 'Chụp lại' : 'Chụp ảnh'}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileInput}
                            aria-label="Chụp ảnh món ăn"
                        />
                    </label>
                    <label
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-sm min-h-[44px] touch-target cursor-pointer transition-colors ${
                            result ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        <ImageIcon className="h-5 w-5" />
                        Thư viện
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileInput}
                            aria-label="Chọn ảnh từ thư viện"
                        />
                    </label>
                </div>
            </div>

            {state === 'preview' && (
                <Button className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-4 min-h-[44px] shadow-lg shadow-emerald-500/25 touch-target"
                    size="lg" onClick={analyze}>
                    <Camera className="h-5 w-5" />
                    Phân tích với AI
                </Button>
            )}

            {state === 'error' && (
                <div className="glass-card rounded-[2rem] p-6 border border-red-100 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-red-700">{errorMsg}</p>
                            <Button variant="ghost" size="sm" className="mt-2 text-slate-600" onClick={() => setState('preview')}>
                                Thử lại
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
                            {confidenceLabel[result.confidence]}
                        </Badge>
                    </div>

                    {/* EDITABLE food name */}
                    <div className="flex items-center gap-2 mb-4">
                        <Pencil className="h-4 w-4 text-emerald-400 shrink-0" />
                        <input
                            type="text"
                            value={editFoodName}
                            onChange={(e) => setEditFoodName(e.target.value)}
                            placeholder="Tên món ăn (có thể chỉnh)..."
                            className="text-xl font-black text-slate-800 bg-transparent border-b-2 border-emerald-300 focus:border-emerald-500 outline-none w-full pb-0.5"
                        />
                    </div>

                    {/* EDITABLE calories */}
                    <div className="flex items-baseline gap-2 mb-5 p-3 bg-slate-50 rounded-2xl">
                        <Flame className="h-5 w-5 text-emerald-500 shrink-0" />
                        <input
                            type="number"
                            value={editCalories}
                            onChange={(e) => setEditCalories(Number(e.target.value))}
                            min={0}
                            className="text-4xl font-black text-slate-800 bg-transparent outline-none w-28"
                        />
                        <span className="text-lg font-semibold text-slate-400">kcal</span>
                    </div>

                    {/* EDITABLE macros – cards với "g" cùng hàng */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { label: 'Protein', value: editProtein, setter: setEditProtein, icon: Beef, color: 'text-blue-500' },
                            { label: 'Carbs', value: editCarbs, setter: setEditCarbs, icon: Wheat, color: 'text-amber-500' },
                            { label: 'Fat', value: editFat, setter: setEditFat, icon: Droplets, color: 'text-orange-500' },
                        ].map(({ label, value, setter, icon: Icon, color }) => (
                            <div key={label} className="glass-card rounded-2xl p-4 flex flex-col items-center">
                                <div className="w-8 h-8 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
                                    <Icon className={`h-4 w-4 ${color}`} />
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => setter(Math.max(0, Number(e.target.value)))}
                                        className={`w-14 text-center text-xl font-black ${color} bg-transparent focus:outline-none`}
                                    />
                                    <span className="text-xs font-semibold text-slate-400">g</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* AI disclaimer nếu confidence thấp */}
                    {result.confidence === 'low' && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
                            ⚠️ AI không thật sự chắc chắn về món ăn này. Bạn hãy kiểm tra lại và chỉnh sửa thông tin trước khi lưu nhé.
                        </p>
                    )}

                    {/* AI Portion Assistant */}
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3 space-y-3">
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm shrink-0">
                                🤖
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">
                                    Mình thấy bạn vừa scan {result.foodName} 🍽️
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Muốn điều chỉnh khẩu phần không?
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['Thêm 1 ly sữa đậu nành', 'Tô lớn hơn', 'Ít cơm hơn'].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => adjustPortion(s)}
                                    disabled={portionLoading}
                                    className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 disabled:opacity-60"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                value={portionInput}
                                onChange={(e) => setPortionInput(e.target.value)}
                                placeholder="Nhập thêm món... (vd: thêm trứng)"
                                className="flex-1 bg-slate-50 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/30 border border-slate-200"
                            />
                            <button
                                type="button"
                                onClick={() => adjustPortion(portionInput)}
                                disabled={portionLoading || !portionInput.trim()}
                                className="w-9 h-9 rounded-xl hoverboard-gradient flex items-center justify-center text-white text-xs font-bold disabled:opacity-60"
                            >
                                {portionLoading ? '...' : 'OK'}
                            </button>
                        </div>
                    </div>

                    {!saved ? (
                        <Button className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-3.5"
                            onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
                            ) : (
                                <>Lưu vào nhật ký</>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
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

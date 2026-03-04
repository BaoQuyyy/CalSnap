// components/floating-ai-assistant.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Minus, Send, Paperclip, Trash2 } from 'lucide-react'
import { toast } from '@/components/toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  image?: string // base64 preview URL
}

const QUICK_ACTIONS = [
  'Tôi vừa ăn gì hôm nay?',
  'Còn bao nhiêu kcal hôm nay?',
  'Tôi vừa ăn 1 tô phở bò',
  'Gợi ý bữa tối theo plan của tôi',
  'Phân tích dinh dưỡng hôm nay',
  'Tôi nên ăn gì để đủ protein?',
]

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(file)
  })

export function FloatingAIAssistant() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem('csnap_ai_chat')
      return raw ? (JSON.parse(raw) as Message[]).slice(-40) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<{ base64: string; preview: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    try {
      window.localStorage.setItem('csnap_ai_chat', JSON.stringify(messages.slice(-40)))
    } catch {
      // ignore
    }
  }, [messages])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await toBase64(file)
    const preview = URL.createObjectURL(file)
    setImage({ base64, preview })
  }

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg && !image) return

    const userMsg: Message = { role: 'user', content: msg, image: image?.preview }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImage(null)
    setLoading(true)

    try {
      const payload: any = {
        message: msg,
        history: messages.slice(-6),
      }
      if (image?.base64) {
        payload.imageBase64 = image.base64
      }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        const friendly =
          data?.error ??
          'Hệ thống AI đang quá tải, xin thử lại sau vài phút.'
        setMessages(prev => [...prev, { role: 'assistant', content: friendly }])
        return
      }

      const reply = data.reply ?? 'Xin lỗi, tôi không hiểu. Bạn thử lại nhé!'

      const actionMatches = reply.matchAll(/\[ACTION:(\w+):(\{.*?\})\]/g)
      let cleanReply = reply.replace(/\[ACTION:.*?\]/g, '').trim()

      for (const match of actionMatches) {
        const actionType = match[1]
        const actionData = JSON.parse(match[2])

        const res = await fetch('/api/assistant/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: actionType, data: actionData }),
        })
        const ok = res.ok
        const json = ok ? await res.json().catch(() => null) : null

        if (actionType === 'LOG_MEAL') {
          cleanReply += `\n\n✅ Đã log: ${actionData.foodName} (${actionData.calories} kcal)`
          if (ok) toast.success(`Đã thêm bữa ăn: ${actionData.foodName}`)
        } else if (actionType === 'UPDATE_MEAL') {
          cleanReply += `\n\n✏️ Đã cập nhật: ${actionData.foodName}`
          if (ok) toast.success(`Đã cập nhật bữa ăn: ${actionData.foodName}`)
        } else if (actionType === 'DELETE_MEAL') {
          cleanReply += `\n\n🗑️ Đã xóa: ${actionData.foodName}`
          if (ok) toast.success(`Đã xoá bữa ăn: ${actionData.foodName}`)
        } else if (actionType === 'UPDATE_GOAL') {
          cleanReply += `\n\n🎯 Đã cập nhật mục tiêu: ${actionData.daily_calorie_goal} kcal/ngày`
          if (ok) toast.success(`Mục tiêu mới: ${actionData.daily_calorie_goal} kcal/ngày`)
        } else if (actionType === 'LOG_WATER') {
          const total = json?.total as number | undefined
          cleanReply += `\n\n💧 Đã ghi nhận thêm ${actionData.amount_ml}ml nước${typeof total === 'number' ? ` (tổng hôm nay ~${(total / 1000).toFixed(1)}L)` : ''
            }`
          if (ok) toast.success('Đã cập nhật lượng nước hôm nay')
          if (ok && typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('calsnap:water-updated', {
                detail: { date: new Date().toISOString().split('T')[0], water_ml: total ?? null },
              })
            )
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanReply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Có lỗi xảy ra, thử lại nhé!' }])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat không?')) {
      setMessages([])
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('csnap_ai_chat')
      }
      toast.success('Đã xóa lịch sử chat')
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-24 right-4 md:right-6 z-50">
        {!open && (
          <div className="relative group">
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full hoverboard-gradient opacity-30 animate-ping" />
            <button
              onClick={() => {
                setOpen(true)
                setMinimized(false)
              }}
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 flex items-center justify-center shadow-[0_18px_45px_rgba(16,185,129,0.55)] hover:scale-110 hover:shadow-[0_22px_55px_rgba(16,185,129,0.7)] transition-transform duration-200"
            >
              <Sparkles size={24} className="text-white drop-shadow-sm" />
            </button>
            <span className="absolute -top-8 right-0 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              AI Assistant
            </span>
          </div>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed right-4 md:right-6 z-50 transition-all duration-300 ${minimized ? 'bottom-24' : 'bottom-28'
            }`}
          style={{ width: '24rem' }}
        >
          <div
            className={`backdrop-blur-xl bg-slate-950/80 border border-emerald-500/20 rounded-3xl shadow-[0_24px_70px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col transition-all duration-300 ${minimized ? 'h-14' : 'h-[500px]'
              }`}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/20 shrink-0 bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-sm">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-emerald-50 text-xs tracking-wide uppercase">
                    CalSnap AI
                  </span>
                  <span className="font-semibold text-slate-50 text-sm">
                    Trợ lý dinh dưỡng cá nhân
                  </span>
                </div>
                <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-200 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Gemini
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(v => !v)}
                  className="w-7 h-7 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center text-emerald-200 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={clearHistory}
                  title="Xóa lịch sử"
                  className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-slate-900/60 via-slate-950/70 to-slate-950">
                  {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400 text-center font-medium mb-1">
                        Mình có thể giúp bạn những điều này 👇
                      </p>
                      {QUICK_ACTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="text-left px-4 py-2.5 rounded-2xl bg-slate-900/60 hover:bg-emerald-500/15 hover:text-emerald-100 text-sm font-medium text-slate-200 transition-colors border border-slate-800/70 hover:border-emerald-500/40"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${m.role === 'user'
                            ? 'bg-gradient-to-br from-emerald-400 to-teal-400 text-white rounded-2xl rounded-br-sm shadow-[0_10px_30px_rgba(16,185,129,0.55)]'
                            : 'bg-slate-900/80 text-slate-50 rounded-2xl rounded-bl-sm border border-slate-800'
                          }`}
                      >
                        {m.image && (
                          <img
                            src={m.image}
                            alt=""
                            className="w-32 rounded-xl mb-2 object-cover border border-slate-700/60"
                          />
                        )}
                        <p className="whitespace-pre-wrap font-normal">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900/80 rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-800">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Image preview */}
                {image && (
                  <div className="px-4 pb-2 bg-slate-950">
                    <div className="relative w-16 h-16">
                      <img
                        src={image.preview}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700/80"
                      />
                      <button
                        onClick={() => setImage(null)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex items-center gap-2 shrink-0">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors shrink-0 border border-slate-700/80"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Hỏi về dinh dưỡng, bữa ăn, thói quen hôm nay..."
                    className="flex-1 bg-slate-900 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 border border-slate-800"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={loading || (!input.trim() && !image)}
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white disabled:opacity-40 shrink-0 shadow-[0_10px_30px_rgba(16,185,129,0.6)]"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// components/floating-ai-habit-assistant.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Minus, Send, Paperclip, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
  })

export function AIAssistantWidget() {
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
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any; messageIndex: number } | null>(null)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (style === 'success') navigator.vibrate([10, 30, 10])
      else if (style === 'medium') navigator.vibrate(20)
      else navigator.vibrate(10)
    }
  }

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

  const handleAction = async (type: string, data: any) => {
    console.log(`[AI ACTION] ${type}:`, data)
    setLoading(true)
    try {
      const res = await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      })
      const ok = res.ok
      const json = ok ? await res.json().catch(() => null) : null

      if (ok) {
        triggerHaptic('success')
        const label = type === 'LOG_MEAL' ? 'Đã thêm' : type === 'UPDATE_MEAL' ? 'Đã cập nhật' : type === 'DELETE_MEAL' ? 'Đã xoá' : type === 'UPDATE_GOAL' ? 'Mục tiêu mới' : 'Đã cập nhật'
        const foodName = data.foodName || 'món ăn'
        const record = json?.data
        const targetId = record?.id || data.mealId
        const targetDate = record?.logged_at || new Date().toISOString().split('T')[0]

        toast.success(`${label}: ${foodName}`, {
          onClick: () => {
            if (targetId) {
              router.push(`/log?highlight=${targetId}`)
            }
          }
        })

        const eventName = (type === 'LOG_WATER' || type === 'UPDATE_WATER') ? 'calsnap:water-updated' : 'calsnap:meal-updated'
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: {
            date: targetDate,
            water_ml: json?.total ?? null,
            mealId: targetId
          }
        }))
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("Action failed:", errorData)
        const displayError = errorData.error || 'Không thể thực hiện yêu cầu.'
        toast.error(displayError)
      }
    } catch (err) {
      console.error("Action connection error:", err)
      toast.error('Lỗi kết nối.')
    } finally {
      setLoading(false)
      setPendingAction(null)
    }
  }

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg && !image) return

    const userMsg: Message = { role: 'user', content: msg, image: image?.preview }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImage(null)
    setLoading(true)
    setPendingAction(null)
    triggerHaptic('light')

    try {
      const payload: any = {
        message: msg,
        history: messages.slice(-6),
      }
      if (image?.base64) payload.imageBase64 = image.base64

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      const errorMsg = data?.error ?? 'Hệ thống AI đang bận, vui lòng thử lại sau.'
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])

      const reply = data.reply ?? '...'
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/)
      // DO NOT strip [ID:...] from the content stored in state (useful for AI history/memory)
      // We only strip [ACTION:...]
      const msgForState = reply.replace(/\[ACTION:[\s\S]*?\]/g, '').trim()

      if (actionMatch) {
        try {
          const type = actionMatch[1]
          const actionData = JSON.parse(actionMatch[2])

          if (type === 'DELETE_MEAL') {
            const msgIdx = messages.length + 1
            setPendingAction({ type, data: actionData, messageIndex: msgIdx })
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: msgForState || `Xác nhận xóa bữa ${actionData.foodName}?`
            }])
          } else {
            await handleAction(type, actionData)
            setMessages(prev => [...prev, { role: 'assistant', content: msgForState }])
          }
        } catch (err) {
          console.error("Failed to parse AI action:", err)
          setMessages(prev => [...prev, { role: 'assistant', content: msgForState }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: msgForState }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lỗi AI.' }])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (confirm('Xóa lịch sử chat?')) {
      setMessages([])
      window.localStorage.removeItem('csnap_ai_chat')
      triggerHaptic('medium')
    }
  }

  return (
    <>
      <div className="fixed bottom-28 right-4 md:right-6 z-50">
        {!open && (
          <div className="relative group">
            <div className="absolute inset-0 rounded-full hoverboard-gradient opacity-30 animate-ping" />
            <button
              onClick={() => { setOpen(true); setMinimized(false) }}
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 flex items-center justify-center shadow-[0_18px_45px_rgba(16,185,129,0.55)] hover:scale-110 transition-transform"
            >
              <Sparkles size={24} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          className={`fixed right-4 md:right-6 z-50 transition-all duration-300 ${minimized ? 'bottom-24' : 'bottom-28'}`}
          style={{ width: 'min(90vw, 24rem)' }}
        >
          <div className={`backdrop-blur-xl bg-slate-950/80 border border-emerald-500/20 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all ${minimized ? 'h-14' : 'h-[500px]'}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="font-bold text-slate-100 text-sm">AI Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(!minimized)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400"><Minus size={14} /></button>
                <button onClick={clearHistory} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"><Trash size={14} /></button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400"><X size={14} /></button>
              </div>
            </div>

            {!minimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                      {QUICK_ACTIONS.map(q => (
                        <button key={q} onClick={() => handleSend(q)} className="text-left px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-emerald-500/20 text-sm text-slate-300 transition-colors border border-white/5">{q}</button>
                      ))}
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 text-sm rounded-2xl break-words ${m.role === 'user' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-slate-900 text-slate-100 rounded-bl-sm border border-slate-800'}`}>
                        {m.image && <img src={m.image} alt="" className="w-32 rounded-xl mb-2 object-cover" />}
                        <p className="whitespace-pre-wrap">
                          {m.content.replace(/\[ID:[^\]]+\]/gi, '').trim()}
                        </p>
                        {m.role === 'assistant' && pendingAction?.messageIndex === i && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                            <button onClick={() => handleAction(pendingAction.type, pendingAction.data)} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg">Xoá ngay</button>
                            <button onClick={() => setPendingAction(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg">Huỷ</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Sparkles size={10} className="text-emerald-400 animate-spin-slow" />
                      </div>
                      <div className="bg-slate-900/90 border border-emerald-500/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center justify-center">
                        <div className="typing-container">
                          <div className="typing-dot bg-emerald-400" style={{ animationDelay: '0s' }} />
                          <div className="typing-dot bg-emerald-400" style={{ animationDelay: '0.2s' }} />
                          <div className="typing-dot bg-emerald-400" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="p-3 border-t border-white/10 bg-black/20 flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button onClick={() => fileRef.current?.click()} className="p-2 hover:bg-white/5 rounded-xl text-slate-400"><Paperclip size={18} /></button>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Hỏi AI..."
                    className="flex-1 bg-white/5 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none border border-white/5"
                  />
                  <button onClick={() => handleSend()} disabled={loading} className="p-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50"><Send size={18} /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

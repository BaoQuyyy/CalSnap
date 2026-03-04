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
      const dataJson = ok ? await res.json().catch(() => null) : null

      if (ok) {
        triggerHaptic('success')
        const json = dataJson?.data
        const targetId = json?.id || data.mealId
        const targetDate = json?.logged_at || new Date().toISOString().split('T')[0]

        toast.success('Hành động hoàn tất!', {
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

      if (!res.ok) {
        const errorMsg = data?.error ?? 'Hệ thống AI đang bận, vui lòng thử lại sau.'
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
        return
      }

      const reply = data.reply ?? '...'
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/)
      // DO NOT strip [ID:...] from state (useful for AI history/memory)
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
    } catch (err) {
      console.error("Assistant error:", err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lỗi AI. Vui lòng thử lại sau.' }])
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
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end pointer-events-none drop-shadow-2xl">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] mb-4 ios-bubble-ai overflow-hidden flex flex-col pointer-events-auto shadow-2xl"
              >
                {/* Minimalist Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/20 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl hoverboard-gradient flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Trợ lý CalSnap</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors active:scale-90"
                  >
                    <ChevronDown size={18} className="text-slate-500" />
                  </button>
                </div>
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
                     {/* Messages Area */ }
                  < div className = "flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide" >
                  {
                    messages.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] p-3 px-4 shadow-sm text-[14.5px] leading-relaxed ${m.role === 'user'
                          ? 'ios-bubble-user'
                          : 'ios-bubble-ai text-slate-800 dark:text-slate-100'
                          }`}>
                          <div
                            className="[&_strong]:font-bold [&_ol]:my-1 [&_ul]:my-1"
                            dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                          />
                        </div>
                      </div>
                    ))
                  }
              { loading && (
                    <div className="flex justify-start">
                      <div className="ios-bubble-ai px-4 py-2.5">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce" />
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                <div ref={scrollRef} />
              </div>

            {/* Premium Input */}
            <div className="p-4 bg-white/50 dark:bg-slate-900/50 border-t border-white/20 dark:border-white/5">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi gì đó..."
                  className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl hoverboard-gradient text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 disabled:opacity-30 active:scale-90 transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-2xl hoverboard-gradient text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto group relative"
      >
        <div className="absolute inset-0 rounded-2xl bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <MessageCircle className={`transition-all duration-500 ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
        <Sparkles className={`absolute transition-all duration-500 ${isOpen ? 'rotate-0 scale-110 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
      </button>
    </div >
      className="typing-dot bg-emerald-400" style = {{ animationDelay: '0.4s' }
} />
                        </div >
                      </div >
                    </div >
                  )}
<div ref={bottomRef} />
                </div >

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
          </div >
        </div >
      )}
    </>
  )
}

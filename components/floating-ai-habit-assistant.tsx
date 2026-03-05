// components/floating-ai-habit-assistant.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Paperclip, Trash, ChevronDown, MessageCircle, MoreVertical } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/toast'
import confetti from 'canvas-confetti'
import { triggerHaptic } from '@/lib/feedback'

interface Message {
  role: 'user' | 'assistant'
  content: string
  image?: string // base64 preview URL
  timestamp: string
}

type ActionData = Record<string, unknown>

const QUICK_ACTIONS = [
  'Tôi vừa ăn gì hôm nay?',
  'Còn bao nhiêu kcal hôm nay?',
  'Gợi ý bữa tối theo plan của tôi',
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
  const [isOpen, setIsOpen] = useState(false)
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
  const [pendingAction, setPendingAction] = useState<{ type: string; data: ActionData; messageIndex: number } | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    try {
      window.localStorage.setItem('csnap_ai_chat', JSON.stringify(messages.slice(-40)))
    } catch { }
  }, [messages])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await toBase64(file)
    const preview = URL.createObjectURL(file)
    setImage({ base64, preview })
  }

  const handleAction = async (type: string, data: ActionData) => {
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
            if (targetId) router.push(`/log?highlight=${targetId}`)
          }
        })

        // iOS Delight: Confetti on success
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#60a5fa']
        })

        const eventName = (type === 'LOG_WATER' || type === 'UPDATE_WATER') ? 'calsnap:water-updated' : 'calsnap:meal-updated'
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { date: targetDate, mealId: targetId }
        }))
      } else {
        const errorData = await res.json().catch(() => ({}))
        const displayError = errorData.error || 'Không thể thực hiện yêu cầu.'
        toast.error(displayError)
      }
    } catch (err) {
      toast.error('Lỗi kết nối.')
    } finally {
      setLoading(false)
      setPendingAction(null)
    }
  }

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg && !image) return

    const userMsg: Message = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImage(null)
    setLoading(true)
    setPendingAction(null)
    triggerHaptic('light')

    try {
      const payload: { message: string; history: { role: string; content: string }[]; imageBase64?: string } = {
        message: msg,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
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
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date().toISOString() }])
        return
      }

      const reply = data.reply ?? '...'
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/)
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
              content: msgForState || `Xác nhận xóa bữa ${actionData.foodName}?`,
              timestamp: new Date().toISOString()
            }])
          } else {
            await handleAction(type, actionData)
            setMessages(prev => [...prev, { role: 'assistant', content: msgForState, timestamp: new Date().toISOString() }])
          }
        } catch (err) {
          setMessages(prev => [...prev, { role: 'assistant', content: msgForState, timestamp: new Date().toISOString() }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: msgForState, timestamp: new Date().toISOString() }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lỗi AI. Vui lòng thử lại sau.', timestamp: new Date().toISOString() }])
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

  const renderContent = (text: string) => {
    const cleanText = text.replace(/\[ID:[^\]]+\]/gi, '').trim()
    return cleanText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
  }

  if (pathname === '/chat') return null

  return (
    <>
      {/* Trigger Button */}
      <div className="fixed bottom-24 right-4 z-50 pointer-events-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-2xl hoverboard-gradient text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto group relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="chat"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
              >
                <MessageCircle />
              </motion.div>
            ) : (
              <motion.div
                key="sparkles"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
              >
                <Sparkles />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(15px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(15px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[96px] right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] ios-bubble-ai overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/20 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 ios-blur">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl hoverboard-gradient flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight leading-none">Trợ lý CalSnap</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">AI ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearHistory} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors text-slate-400 hover:text-red-500">
                  <Trash size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors">
                  <ChevronDown size={18} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
              {messages.length === 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Đề xuất cho bạn</p>
                  {QUICK_ACTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left px-4 py-3 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-emerald-500/10 text-[13px] text-slate-700 dark:text-slate-300 transition-all border border-white/40 dark:border-white/5 active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} ios-spring-enter`} style={{ animationDelay: '0.1s' }}>
                  <div className={`max-w-[85%] p-3 px-4 shadow-sm text-[14.5px] leading-relaxed ${m.role === 'user'
                    ? 'ios-bubble-user'
                    : 'ios-bubble-ai text-slate-800 dark:text-slate-100'
                    }`}>
                    <div
                      className="[&_strong]:font-bold [&_ol]:my-1 [&_ul]:my-1"
                      dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                    />

                    {/* Inline Actions for DELETE confirm in widget */}
                    {pendingAction?.messageIndex === i && m.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                          onClick={() => handleAction(pendingAction.type, pendingAction.data)}
                          className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-sm"
                        >
                          Xóa ngay
                        </button>
                        <button
                          onClick={() => setPendingAction(null)}
                          className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="ios-bubble-ai px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-emerald-400"
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 pt-3 pb-6 bg-white/60 dark:bg-slate-950/60 border-t border-white/20 dark:border-white/5 ios-blur">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi gì đó..."
                  disabled={loading}
                  className="w-full bg-slate-100/80 dark:bg-slate-900/80 border-none rounded-2xl pl-4 pr-12 py-3.5 text-[15px] focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none dark:text-white"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl hoverboard-gradient text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 disabled:opacity-30 active:scale-90 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

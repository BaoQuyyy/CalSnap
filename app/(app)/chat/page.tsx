// app/(app)/chat/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, Trash } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/toast'
import { triggerHaptic } from '@/lib/feedback'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: string }

type ActionData = Record<string, unknown>

const STORAGE_KEY = 'calsnap_chat_history'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày

interface StoredChat {
  messages: Message[]
  savedAt: number // timestamp ms
}

const SUGGESTIONS = [
  'Hôm nay tôi đã ăn gì rồi?',
  'Tôi nên ăn gì sau khi tập?',
  'Phân tích macro ngày hôm nay',
  'Gợi ý bữa nhẹ dưới 200 kcal',
]

// Load từ localStorage, trả [] nếu quá hạn hoặc không có
function loadHistory(): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const stored: StoredChat = JSON.parse(raw)
    if (Date.now() - stored.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return stored.messages ?? []
  } catch {
    return []
  }
}

function saveHistory(messages: Message[]) {
  if (typeof window === 'undefined') return
  try {
    const stored: StoredChat = { messages, savedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage đầy hoặc private mode — bỏ qua
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: string; data: ActionData; messageIndex: number } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hydrate từ localStorage chỉ 1 lần sau mount
  useEffect(() => {
    const history = loadHistory()
    setMessages(history)
    setHydrated(true)
  }, [])

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Lưu vào localStorage mỗi khi messages thay đổi (sau hydrate)
  useEffect(() => {
    if (!hydrated) return
    saveHistory(messages)
  }, [messages, hydrated])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const isOverload = res.status === 429
        const msg =
          data?.error ??
          (isOverload
            ? 'Hệ thống AI đang quá tải, vui lòng thử lại sau vài phút.'
            : 'Đã xảy ra lỗi khi gọi AI, vui lòng thử lại.')
        throw new Error(msg)
      }

      // Stream the response
      const reader = res.body?.getReader()
      if (!reader) {
        throw new Error('Lỗi kết nối stream. Vui lòng thử lại.')
      }
      const decoder = new TextDecoder()
      let fullReply = ''
      const assistantMsgTimestamp = new Date().toISOString()

      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: assistantMsgTimestamp }])

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const chunk = JSON.parse(payload) as string
            fullReply += chunk
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: fullReply }
              }
              return updated
            })
          } catch {
            // ignore parse errors
          }
        }
      }

      const reply = fullReply
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/)
      // DO NOT strip [ID:...] for state storage - we need it in history for next turn memory
      const msgForState = reply.replace(/\[ACTION:[\s\S]*?\]/g, '').trim()

      // Update final message with cleaned text (no ACTION tags)
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: msgForState }
        }
        return updated
      })

      if (actionMatch) {
        try {
          const type = actionMatch[1]
          const actionData = JSON.parse(actionMatch[2])

          if (type === 'DELETE_MEAL') {
            const msgIdx = messages.length + 1
            setPendingAction({ type, data: actionData, messageIndex: msgIdx })
          } else {
            await handleAction(type, actionData)
          }
        } catch (err) {
          console.error("Failed to parse AI action:", err)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi kết nối.')
    } finally {
      setLoading(false)
    }
  }, [loading, messages])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const messageVariants = {
    hidden: { opacity: 0, scale: 0.97, y: 12, filter: 'blur(4px)' },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        damping: 28,
        stiffness: 350,
        mass: 0.8
      }
    }
  }

  const handleAction = async (type: string, data: ActionData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      })
      const dataJson = await res.json()
      if (res.ok) {
        triggerHaptic('success')
        const record = dataJson?.data
        const targetId = record?.id || data.mealId
        const targetDate = record?.logged_at || new Date().toISOString().split('T')[0]

        toast.success('Hành động hoàn tất!', {
          onClick: () => {
            if (targetId) {
              router.push(`/log?highlight=${targetId}`)
            }
          }
        })
        // Dispatch sync event with data for robust sync
        window.dispatchEvent(new CustomEvent('calsnap:meal-updated', {
          detail: {
            date: targetDate,
            mealId: targetId
          }
        }))
      } else {
        // Safe to call res.json() only once or handle if it was already parsed
        const errorData = dataJson || {}
        console.error("Action error detail:", errorData)
        toast.error('Không thể thực hiện yêu cầu.')
      }
    } catch (err) {
      console.error("Action error:", err)
      toast.error('Lỗi thực hiện yêu cầu.')
    } finally {
      setLoading(false)
      setPendingAction(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    if (confirm('Xóa lịch sử chat?')) {
      setMessages([])
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
      triggerHaptic('medium')
    }
  }

  // Parse markdown: **bold**, *italic*, lists, newlines
  const renderContent = (text: string) => {
    // Strip technical IDs before rendering to user
    const cleanText = text.replace(/\[ID:[^\]]+\]/gi, '').trim()

    let html = cleanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Ordered lists
    html = html.replace(
      /((?:^|\n)\d+\.\s.+)+/g,
      (block: string) => {
        const items = block
          .trim()
          .split('\n')
          .filter((l: string) => l.match(/^\d+\./))
          .map((l: string) => `<li class="ml-4 list-decimal">${l.replace(/^\d+\.\s*/, '')}</li>`)
          .join('')
        return `<ol class="space-y-1 my-2 pl-2">${items}</ol>`
      }
    )

    // Unordered lists
    html = html.replace(
      /((?:^|\n)-\s.+)+/g,
      (block: string) => {
        const items = block
          .trim()
          .split('\n')
          .filter((l: string) => l.match(/^-\s/))
          .map((l: string) => `<li class="ml-4 list-disc">${l.replace(/^-\s*/, '')}</li>`)
          .join('')
        return `<ul class="space-y-1 my-2 pl-2">${items}</ul>`
      }
    )

    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />')

    return html
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed inset-0 top-14 md:top-16 bottom-[4.5rem] md:bottom-0 left-0 right-0 z-[40] md:max-w-2xl md:mx-auto bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-300">

      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header - Fixed Top */}
      <div className="ios-blur z-30 px-6 py-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl hoverboard-gradient flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white text-lg font-extrabold tracking-tight">
              CalSnap AI
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 flex items-center justify-center"
        >
          <Trash className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages - Scrollable Middle */}
      <motion.div
        ref={scrollRef}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto px-4 py-8 flex flex-col gap-6 scroll-smooth scrollbar-hide pb-32"
      >
        {hydrated && messages.length === 0 && !loading && (
          <motion.div
            variants={messageVariants}
            className="flex-1 flex flex-col items-center justify-center text-center py-20"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="w-24 h-24 rounded-[2.5rem] hoverboard-gradient flex items-center justify-center mb-8 shadow-2xl relative z-10">
                <Sparkles className="text-white h-12 w-12 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">CalSnap AI</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed text-sm font-bold opacity-80">
              Trợ lý sức khỏe thông minh của riêng anh. Hãy bắt đầu bằng một bữa ăn nhé!
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center mt-12 px-6">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-5 py-3.5 ios-glass rounded-2xl text-[13px] font-black text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-all shadow-sm active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <motion.div
              key={`${m.timestamp}-${i}`}
              variants={messageVariants}
              layout
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[88%] md:max-w-[82%] p-4 px-5 text-[15.5px] leading-relaxed break-words ios-shadow ${m.role === 'user'
                ? 'rounded-[22px] rounded-br-[6px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                : 'rounded-[22px] rounded-bl-[6px] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 text-slate-800 dark:text-slate-100'
                }`}>
                {m.role === 'assistant' ? (
                  <div
                    className="[&_strong]:font-black [&_strong]:text-emerald-600 dark:[&_strong]:text-emerald-400 [&_em]:italic [&_ol]:my-3 [&_ul]:my-3 [&_li]:leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed font-bold">{m.content}</p>
                )}

                {pendingAction?.messageIndex === i && (
                  <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-200/50 dark:border-white/10">
                    <button
                      onClick={() => handleAction(pendingAction.type, pendingAction.data)}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-black active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                <div className={`mt-2.5 flex items-center gap-1.5 opacity-40 ${m.role === 'user' ? 'text-white' : 'text-slate-500'}`}>
                  <span className="text-[10px] font-black uppercase tracking-tighter">{formatTime(m.timestamp)}</span>
                  {m.role === 'assistant' && <Sparkles size={10} className="text-emerald-500" />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[22px] rounded-bl-[6px] px-6 py-4 ios-shadow border border-slate-200/50 dark:border-white/5">
              <div className="flex gap-1.5 h-4 items-center">
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
      </motion.div>

      {/* Input Area - Fixed Bottom */}
      <div className="absolute bottom-6 left-4 right-4 z-50">
        <div className="max-w-3xl mx-auto ios-glass ios-shadow rounded-[2.5rem] p-2 flex items-center gap-2">
          <div className="flex-1 relative group pl-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn cho trợ lý CalSnap..."
              disabled={loading}
              className="w-full bg-transparent py-4 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-bold"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-full hoverboard-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-all active:scale-90 shadow-xl shadow-emerald-500/30"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
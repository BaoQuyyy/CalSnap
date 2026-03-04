// app/(app)/chat/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/toast'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: string }

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
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any; messageIndex: number } | null>(null)
  const router = useRouter()
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

      const data = await res.json()

      if (!res.ok) {
        const isOverload = res.status === 429
        const msg =
          data?.error ??
          (isOverload
            ? 'Hệ thống AI đang quá tải, vui lòng thử lại sau vài phút.'
            : 'Đã xảy ra lỗi khi gọi AI, vui lòng thử lại.')
        throw new Error(msg)
      }

      const rawReply: string =
        typeof data.reply === 'string'
          ? data.reply
          : 'Xin lỗi, hiện tại tôi không thể trả lời. Bạn thử lại sau nhé.'

      const reply = data.reply ?? 'Mình chưa hiểu ý bạn lắm.'
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/)
      // DO NOT strip [ID:...] for state storage - we need it in history for next turn memory
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
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: msgForState,
              timestamp: new Date().toISOString()
            }])
          }
        } catch (err) {
          console.error("Failed to parse AI action:", err)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: msgForState,
            timestamp: new Date().toISOString()
          }])
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: msgForState,
          timestamp: new Date().toISOString()
        } as Message])
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
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const messageVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 15, filter: 'blur(8px)' },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring', damping: 20, stiffness: 200 }
    }
  }

  const handleAction = async (type: string, data: any) => {
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

  const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (style === 'success') navigator.vibrate([10, 30, 10])
      else navigator.vibrate(10)
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
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] w-full max-w-2xl mx-auto overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-3xl animate-in fade-in duration-500">

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
        className="flex-1 overflow-y-auto px-4 py-8 flex flex-col gap-5 scroll-smooth scrollbar-hide"
      >
        {hydrated && messages.length === 0 && !loading && (
          <motion.div
            variants={messageVariants}
            className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-60"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/5">
              <Sparkles className="text-emerald-500 h-10 w-10 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Chào anh! 👋</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-[250px] leading-relaxed text-sm font-medium">
              Em đã sẵn sàng hỗ trợ anh ghi log bữa ăn và tính calo rồi ạ.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-8 px-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors shadow-sm active:scale-95"
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
              <div className={`max-w-[85%] md:max-w-[80%] p-4 text-[15.5px] leading-relaxed break-words shadow-sm ${m.role === 'user'
                ? 'ios-bubble-user'
                : 'ios-bubble-ai text-slate-800 dark:text-slate-100'
                }`}>
                {m.role === 'assistant' ? (
                  <div
                    className="[&_strong]:font-black [&_strong]:text-emerald-600 dark:[&_strong]:text-emerald-400 [&_em]:italic [&_ol]:my-2 [&_ul]:my-2 [&_li]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{m.content}</p>
                )}

                {pendingAction?.messageIndex === i && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                    <button
                      onClick={() => handleAction(pendingAction.type, pendingAction.data)}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                      XÁC NHẬN XÓA
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-black active:scale-95 transition-all"
                    >
                      HỦY
                    </button>
                  </div>
                )}

                <p className={`text-[10px] mt-2 font-black opacity-40 uppercase tracking-tighter ${m.role === 'user' ? 'text-white' : 'text-slate-500'}`}>
                  {formatTime(m.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
            <div className="ios-bubble-ai px-5 py-3">
              <div className="flex gap-1.5 h-4 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Input Area - Fixed Bottom */}
      <div className="p-4 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50 ios-blur shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn cho trợ lý CalSnap..."
              disabled={loading}
              className="w-full bg-white/80 dark:bg-slate-800/80 rounded-[1.25rem] px-5 py-3.5 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Sparkles className={`h-4 w-4 transition-colors ${input.trim() ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-[1.25rem] hoverboard-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-all active:scale-90 shadow-lg shadow-emerald-500/20"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
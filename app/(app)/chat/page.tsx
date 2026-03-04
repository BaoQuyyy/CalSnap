// app/(app)/chat/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
      // Strip both ACTIONS and internal IDs [ID:...]
      let cleanReply = reply
        .replace(/\[ACTION:[\s\S]*?\]/g, '')
        .replace(/\[ID:[^\]]+\]/gi, '')
        .trim()

      if (actionMatch) {
        try {
          const type = actionMatch[1]
          const actionData = JSON.parse(actionMatch[2])

          if (type === 'DELETE_MEAL') {
            const msgIdx = messages.length + 1
            setPendingAction({ type, data: actionData, messageIndex: msgIdx })
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: cleanReply || `Xác nhận xóa bữa ${actionData.foodName}?`,
              timestamp: new Date().toISOString()
            }])
          } else {
            await handleAction(type, actionData)
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: cleanReply,
              timestamp: new Date().toISOString()
            }])
          }
        } catch (err) {
          console.error("Failed to parse AI action:", err)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: cleanReply,
            timestamp: new Date().toISOString()
          }])
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: cleanReply,
          timestamp: new Date().toISOString()
        } as Message])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi kết nối.')
    } finally {
      setLoading(false)
    }
  }, [loading, messages])

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
        const errorData = await res.json().catch(() => ({}))
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
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Ordered lists
    html = html.replace(
      /((?:^|\n)\d+\.\s.+)+/g,
      (block) => {
        const items = block
          .trim()
          .split('\n')
          .filter((l) => l.match(/^\d+\./))
          .map((l) => `<li class="ml-4 list-decimal">${l.replace(/^\d+\.\s*/, '')}</li>`)
          .join('')
        return `<ol class="space-y-1 my-2 pl-2">${items}</ol>`
      }
    )

    // Unordered lists
    html = html.replace(
      /((?:^|\n)-\s.+)+/g,
      (block) => {
        const items = block
          .trim()
          .split('\n')
          .filter((l) => l.match(/^-\s/))
          .map((l) => `<li class="ml-4 list-disc">${l.replace(/^-\s*/, '')}</li>`)
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
    <div className="font-sans flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] max-w-2xl mx-auto page-enter min-h-0 w-full max-w-full overflow-hidden">

      {/* Header */}
      <div className="nutri-header rounded-[2rem] overflow-hidden mb-4">
        <div className="relative z-10 px-5 md:px-8 pt-10 pb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-white text-xl font-display font-extrabold">
              Trợ lý dinh dưỡng AI 🤖
            </h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-white/15 text-white text-xs font-semibold rounded-full border border-white/15">
              Hoạt động bởi Gemini
            </span>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Xóa lịch sử chat"
            title="Xóa lịch sử chat"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Hỏi mình bất cứ điều gì về dinh dưỡng!
            </h2>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="px-4 py-3 min-h-[44px] glass-card rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/80 transition-colors touch-target flex items-center"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm break-words break-all ${m.role === 'user'
              ? 'hoverboard-gradient text-white rounded-tr-sm'
              : 'glass-card rounded-tl-sm'
              }`}>
              {m.role === 'assistant' ? (
                <>
                  <div
                    className="leading-relaxed text-slate-800 dark:text-slate-100/90 [&_strong]:font-bold [&_strong]:text-current [&_em]:italic [&_em]:text-current [&_ol]:my-2 [&_ul]:my-2 [&_li]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                  />

                  {/* Confirmation Buttons for DELETE */}
                  {pendingAction?.messageIndex === i && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                      <button
                        onClick={() => handleAction(pendingAction.type, pendingAction.data)}
                        className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all active:scale-95"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        onClick={() => setPendingAction(null)}
                        className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all active:scale-95"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              )}
              <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                {formatTime(m.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
              <Sparkles size={14} className="text-emerald-500" />
            </div>
            <div className="glass-card px-4 py-3 rounded-[1.5rem] rounded-tl-sm flex items-center justify-center">
              <div className="typing-container">
                <div className="typing-dot" style={{ animationDelay: '0s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-card rounded-[2rem] p-4 mt-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về dinh dưỡng, bữa ăn, kế hoạch tập luyện..."
            disabled={loading}
            className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 text-base font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 border-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full hoverboard-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity touch-target"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
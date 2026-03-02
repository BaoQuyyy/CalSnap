'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Trash2, Loader2 } from 'lucide-react'
import { toast } from '@/components/toast'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: Date }

const SUGGESTIONS = [
  'How many calories in a bowl of pho?',
  'What should I eat after workout?',
  'Analyze my macros today',
  'Healthy snack ideas under 200 cal',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply ?? 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      }
      setMessages((m) => [...m, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] max-w-2xl mx-auto page-enter min-h-0 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="glass-card rounded-[2rem] p-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">AI Nutrition Coach 🤖</h1>
          <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-600 text-xs font-semibold rounded-full">
            Powered by Gemini
          </span>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="p-2 min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors touch-target flex items-center justify-center"
          aria-label="Clear chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
      >
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ask me anything about nutrition!</h2>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="px-4 py-3 min-h-[44px] glass-card rounded-2xl text-sm font-medium text-slate-700 hover:bg-white/80 transition-colors touch-target flex items-center"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm ${
                m.role === 'user'
                  ? 'hoverboard-gradient text-white rounded-tr-sm'
                  : 'glass-card text-slate-800 rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  m.role === 'user' ? 'text-white/70' : 'text-slate-400'
                }`}
              >
                {m.timestamp.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass-card p-4 rounded-[1.5rem] rounded-tl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
            placeholder="Ask about nutrition..."
            disabled={loading}
            className="flex-1 min-w-0 bg-slate-50 rounded-2xl px-4 py-3 text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 border-none"
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

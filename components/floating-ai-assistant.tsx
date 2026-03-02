// components/floating-ai-assistant.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Minus, Send, Paperclip } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  image?: string // base64 preview URL
}

const QUICK_ACTIONS = [
  'Hôm nay tôi đã ăn gì?',
  'Còn bao nhiêu kcal hôm nay?',
  'Log 1 tô phở bò cho tôi',
  'Gợi ý bữa tối lành mạnh',
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<{ base64: string; preview: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          imageBase64: image?.base64 ?? null,
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      const reply = data.reply ?? 'Xin lỗi, tôi không hiểu. Bạn thử lại nhé!'

      // Parse [ACTION:...] tags
      const actionMatch = reply.match(/\[ACTION:(\w+):(\{.*?\})\]/)
      let cleanReply = reply.replace(/\[ACTION:.*?\]/g, '').trim()

      if (actionMatch) {
        const actionType = actionMatch[1]
        const actionData = JSON.parse(actionMatch[2])

        if (actionType === 'LOG_MEAL') {
          await fetch('/api/assistant/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'LOG_MEAL', data: actionData }),
          })
          cleanReply += `\n\n✅ Đã log: ${actionData.foodName} (${actionData.calories} kcal)`
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanReply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Có lỗi xảy ra, thử lại nhé!' }])
    } finally {
      setLoading(false)
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
              onClick={() => { setOpen(true); setMinimized(false) }}
              className="relative w-14 h-14 rounded-full hoverboard-gradient flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform"
            >
              <Sparkles size={24} className="text-white" />
            </button>
            <span className="absolute -top-8 right-0 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              AI Assistant
            </span>
          </div>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div className={`fixed right-4 md:right-6 z-50 transition-all duration-300 ${minimized ? 'bottom-24' : 'bottom-28'}`}
          style={{ width: '24rem' }}>
          <div className={`glass-card rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${minimized ? 'h-14' : 'h-[500px]'}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl hoverboard-gradient flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-black text-slate-800 text-sm">AI Assistant ✨</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">Gemini</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(v => !v)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <Minus size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400 text-center font-medium mb-1">Tôi có thể giúp bạn 👇</p>
                      {QUICK_ACTIONS.map((q) => (
                        <button key={q} onClick={() => handleSend(q)}
                          className="text-left px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold text-slate-600 transition-colors border border-slate-100 hover:border-emerald-200">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${m.role === 'user'
                        ? 'hoverboard-gradient text-white rounded-[1.5rem] rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-[1.5rem] rounded-bl-sm'} px-4 py-3`}>
                        {m.image && (
                          <img src={m.image} alt="" className="w-32 rounded-xl mb-2 object-cover" />
                        )}
                        <p className="text-sm font-medium whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-[1.5rem] rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Image preview */}
                {image && (
                  <div className="px-4 pb-2">
                    <div className="relative w-16 h-16">
                      <img src={image.preview} alt="" className="w-16 h-16 rounded-xl object-cover" />
                      <button onClick={() => setImage(null)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button onClick={() => fileRef.current?.click()}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0">
                    <Paperclip size={16} />
                  </button>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Hỏi về dinh dưỡng..."
                    className="flex-1 bg-slate-50 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={loading || (!input.trim() && !image)}
                    className="w-9 h-9 rounded-xl hoverboard-gradient flex items-center justify-center text-white disabled:opacity-50 shrink-0">
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

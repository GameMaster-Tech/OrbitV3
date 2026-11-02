'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, RotateCcw, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useWallet } from '@/hooks/useWallet'
import { getHealthProfile } from '@/lib/database'
import { cn } from '@/lib/utils'
import type { HealthProfile } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  { text: 'What items are expiring soon?',     color: '#F43F5E', bg: 'rgba(244,63,94,0.1)'   },
  { text: 'How much have I spent this month?', color: '#6366F1', bg: 'rgba(99,102,241,0.1)'  },
  { text: 'What can I cook with what I have?', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  { text: 'Am I over budget anywhere?',        color: '#DC2626', bg: 'rgba(220,38,38,0.1)'   },
  { text: 'What should I buy this week?',      color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  { text: 'Give me a household summary',       color: '#0891B2', bg: 'rgba(8,145,178,0.1)'   },
]

export default function AssistantPage() {
  const { user, profile } = useAuthStore()
  const { items } = useInventory(user?.uid)
  const { wallet, expenses, budgets } = useWallet(user?.uid)
  const [health, setHealth] = useState<HealthProfile | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!user?.uid) {
      setHealth(null)
      return
    }

    let cancelled = false
    getHealthProfile(user.uid)
      .then((profile) => {
        if (!cancelled) setHealth(profile)
      })
      .catch(() => {
        if (!cancelled) setHealth(null)
      })

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, context: { inventory: items, expenses, budgets, wallet, health } }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.reply ?? 'Sorry, I could not process that.',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <AppShell title="Assistant" subtitle="Ask anything about your household">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">

        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-4"
          >
            {/* Colourful hero icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #F59E0B 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full" style={{ background: '#F43F5E' }} />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
            </div>

            <h2 className="font-display text-3xl font-bold italic mb-2" style={{ color: 'var(--text)' }}>
              How can I help?
            </h2>
            <p className="font-sans text-sm mb-8 max-w-sm" style={{ color: 'var(--muted)' }}>
              Ask me anything about your inventory, spending, health, or household — I have full context.
            </p>

            {/* Colourful suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s.text} onClick={() => send(s.text)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all group hover:-translate-y-0.5"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                  {s.text}
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-10">
              {[
                { label: 'Items tracked', value: items.length,    color: '#6366F1' },
                { label: 'Expenses',      value: expenses.length, color: '#F59E0B' },
                { label: 'Budgets',       value: budgets.length,  color: '#059669' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="font-sans text-2xl font-bold" style={{ color }}>{value}</p>
                  <p className="font-sans text-xs" style={{ color: 'var(--dim)' }}>{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div className="shrink-0 mt-0.5">
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #F59E0B)' }}>
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm')}
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'white', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }
                      : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }
                    }
                  >
                    {msg.content.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) return <p key={i} className="font-semibold text-sm mb-1 mt-2">{line.slice(3)}</p>
                      if (line.startsWith('- '))  return <p key={i} className="flex gap-1.5 mb-0.5"><span className="opacity-50 shrink-0">•</span>{line.slice(2)}</p>
                      if (line === '')             return <div key={i} className="h-1.5" />
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#6366F1' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 mt-3 rounded-2xl p-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(15,17,23,0.08)' }}>
          <div className="flex items-end gap-2">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Ask about your household..."
              rows={1} className="flex-1 resize-none bg-transparent outline-none font-sans text-sm leading-relaxed py-1 max-h-32 overflow-y-auto"
              style={{ color: 'var(--text)', scrollbarWidth: 'none' }} />
            <div className="flex items-center gap-1.5 shrink-0">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ color: 'var(--dim)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="font-sans text-[10px] mt-2 px-1" style={{ color: 'var(--dim)' }}>
            Enter to send · Shift+Enter for new line · Powered by Groq
          </p>
        </div>
      </div>
    </AppShell>
  )
}

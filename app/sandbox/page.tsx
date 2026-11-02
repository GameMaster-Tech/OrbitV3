'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, Play, Loader, Sparkles, RotateCcw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useWallet } from '@/hooks/useWallet'

const EXAMPLES = [
  'What if 6 guests come for dinner this weekend?',
  'What if I meal prep for the entire next week?',
  'What if my fridge breaks down for 3 days?',
  'What if I need to throw a birthday party for 15 kids?',
  'What if I go on a 2-week vacation?',
  'What if I want to eat healthy for a month?',
]

const HEADINGS = [
  'WHAT WILL HAPPEN',
  'WHAT YOU NEED TO BUY',
  'USING EXPIRING ITEMS',
  'ACTION PLAN',
  'ESTIMATED BUDGET',
]

function SimResult({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split('\n').map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-2" />
        if (HEADINGS.some(h => t.toUpperCase().startsWith(h))) {
          return (
            <p key={i} className="font-sans text-xs font-bold uppercase tracking-widest pt-4 pb-1 first:pt-0"
              style={{ color: '#F59E0B' }}>{t}</p>
          )
        }
        if (/^\d+\./.test(t)) {
          return (
            <p key={i} className="font-sans text-sm leading-relaxed flex gap-2">
              <span className="shrink-0 font-semibold" style={{ color: '#6366F1' }}>{t.match(/^\d+/)?.[0]}.</span>
              <span style={{ color: 'var(--text)' }}>{t.replace(/^\d+\.\s*/, '')}</span>
            </p>
          )
        }
        if (t.startsWith('-') || t.startsWith('•')) {
          return (
            <p key={i} className="font-sans text-sm leading-relaxed flex gap-2">
              <span className="shrink-0" style={{ color: 'var(--muted)' }}>•</span>
              <span style={{ color: 'var(--text)' }}>{t.replace(/^[-•]\s*/, '')}</span>
            </p>
          )
        }
        return <p key={i} className="font-sans text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{t}</p>
      })}
    </div>
  )
}

export default function HouseholdSimPage() {
  const { user } = useAuthStore()
  const { items } = useInventory(user?.uid)
  const { wallet } = useWallet(user?.uid)

  const [scenario, setScenario] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [reply, setReply] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastScenario, setLastScenario] = useState('')

  const run = async () => {
    if (!scenario.trim() || simulating) return
    setSimulating(true)
    setReply(null)
    setError(null)
    setLastScenario(scenario.trim())
    try {
      const res = await fetch('/api/ai/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario.trim(), inventory: items, wallet }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setReply(data.reply ?? 'No response received.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSimulating(false)
    }
  }

  const reset = () => { setReply(null); setError(null); setScenario(''); setLastScenario('') }

  return (
    <AppShell title="Household Sim" subtitle="Simulate any scenario against your live household data">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="card card-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)' }}>
              <FlaskConical className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>What if...</p>
              <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                Describe any scenario — Orbit analyses your {items.length} tracked items and responds
              </p>
            </div>
          </div>

          <textarea
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) run() }}
            placeholder="e.g. What if 6 guests come for dinner this weekend?"
            className="orbit-input min-h-[90px] resize-none mb-3"
            rows={3}
          />

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setScenario(ex)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--elevated)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {ex}
              </button>
            ))}
          </div>

          <button onClick={run} disabled={!scenario.trim() || simulating}
            className="btn-primary w-full py-2.5 gap-2 disabled:opacity-40">
            {simulating
              ? <><Loader className="w-4 h-4 animate-spin" /> Simulating...</>
              : <><Play className="w-4 h-4" /> Run Simulation</>}
          </button>
        </div>

        {simulating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card card-md text-center py-10">
              <Sparkles className="w-8 h-8 mx-auto mb-3 animate-pulse" style={{ color: '#F59E0B' }} />
              <p className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>Running simulation...</p>
              <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Analysing your {items.length} items against the scenario
              </p>
            </div>
          </motion.div>
        )}

        {error && !simulating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card card-md" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
              <p className="font-sans text-sm" style={{ color: '#F43F5E' }}>{error}</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {reply && !simulating && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="card card-lg"
                style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>Orbit&apos;s Analysis</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                        &ldquo;{lastScenario.length > 60 ? lastScenario.slice(0, 60) + '…' : lastScenario}&rdquo;
                      </p>
                    </div>
                  </div>
                  <button onClick={reset}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: 'var(--dim)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <SimResult text={reply} />

                <p className="font-sans text-[10px] mt-4 pt-3 border-t"
                  style={{ color: 'var(--dim)', borderColor: 'var(--border)' }}>
                  Powered by Groq · Based on your live household data
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

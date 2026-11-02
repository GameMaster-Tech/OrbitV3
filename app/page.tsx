'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, ShoppingBasket, Heart, Wallet, RefreshCw,
  MessageSquare, Sparkles, Shield, Zap, CheckCircle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const FEATURES = [
  {
    icon: ShoppingBasket,
    color: 'text-orbit-info', bg: 'bg-orbit-info/15',
    title: 'Smart Inventory',
    desc: 'Track groceries, electronics, and documents. Get alerts before things expire — with the exact dollar value at risk.',
  },
  {
    icon: Heart,
    color: 'text-orbit-critical', bg: 'bg-orbit-critical/15',
    title: 'Health Profile',
    desc: 'Store allergies, medications, and dietary restrictions. Orbit warns you when a new item conflicts with your health.',
  },
  {
    icon: Wallet,
    color: 'text-orbit-success', bg: 'bg-orbit-success/15',
    title: 'Budget Tracking',
    desc: 'Log expenses, set budgets, and see exactly where your money goes — with smart alerts when you\'re close to limits.',
  },
  {
    icon: RefreshCw,
    color: 'text-orbit-accent', bg: 'bg-orbit-accent/15',
    title: 'SwapSync',
    desc: 'List expiring items on your community marketplace. Earn credits, reduce waste, and help your neighbours.',
  },
  {
    icon: MessageSquare,
    color: 'text-orbit-primary', bg: 'bg-orbit-primary/15',
    title: 'AI Assistant',
    desc: 'Ask anything about your household. "What can I cook tonight?" or "Am I over budget?" — answered instantly.',
  },
  {
    icon: Sparkles,
    color: 'text-orbit-neural', bg: 'bg-orbit-neural/15',
    title: 'Household Sim',
    desc: 'Simulate scenarios. "What if 8 guests come for dinner?" — Orbit models the impact and builds a shopping list.',
  },
]

const STATS = [
  { value: '2.4×', label: 'Less food waste' },
  { value: '₹340', label: 'Avg monthly savings' },
  { value: '15min', label: 'Setup time' },
  { value: '100%', label: 'Private & secure' },
]

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard')
  }, [user, isLoading, router])

  if (isLoading) return null
  if (user) return null

  return (
    <div className="min-h-screen hero-gradient">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: 'rgba(247,242,234,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(200,186,165,0.6)',
        }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(231 84% 67%), hsl(221 83% 53%))' }}>
            <span className="font-display text-white text-sm italic font-bold">O</span>
          </div>
          <span className="font-display text-xl italic text-orbit-text tracking-wide">Orbit</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/auth?mode=login')} className="btn-ghost py-2 px-4 text-sm">
            Sign in
          </button>
          <button onClick={() => router.push('/auth?mode=signup')} className="btn-primary py-2 px-4 text-sm">
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, hsl(231 84% 67% / 0.15), hsl(221 83% 53% / 0.1))', border: '1px solid hsl(231 84% 67% / 0.25)', color: 'hsl(231 84% 67%)' }}>
            <Sparkles className="w-3 h-3" />
            Powered by Gemini & Groq AI
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold italic text-orbit-text leading-[1.05] mb-6 tracking-tight">
            Your home,{' '}
            <span className="gradient-text">intelligently</span>{' '}
            managed.
          </h1>

          <p className="font-sans text-lg text-orbit-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Orbit is your AI-powered household command center. Track inventory, manage budgets, monitor health, and never let food expire again — all in one place.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => router.push('/demo')}
              className="btn-accent px-8 py-3 text-base gap-2">
              Explore demo
              <Sparkles className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/auth?mode=signup')}
              className="btn-primary px-8 py-3 text-base gap-2">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/auth?mode=login')}
              className="btn-ghost px-8 py-3 text-base">
              Sign in
            </button>
          </div>

          <p className="font-sans text-xs text-orbit-dim mt-4">No credit card required · 50 credits on signup</p>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 relative"
        >
          {/* Mock dashboard preview */}
          <div className="rounded-2xl overflow-hidden border border-orbit-border shadow-2xl"
            style={{ boxShadow: '0 32px 80px rgba(60,40,20,0.15), 0 8px 24px rgba(60,40,20,0.08)' }}>
            {/* Fake topbar */}
            <div className="h-10 flex items-center px-4 gap-3 border-b border-orbit-border"
              style={{ background: 'var(--surface)' }}>
              <div className="flex gap-1.5">
                {['bg-orbit-critical', 'bg-orbit-warning', 'bg-orbit-success'].map((c, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-60`} />
                ))}
              </div>
              <div className="flex-1 h-4 rounded-full bg-orbit-elevated mx-8" />
            </div>
            {/* Fake content */}
            <div className="p-5 grid grid-cols-4 gap-3" style={{ background: 'var(--bg)' }}>
              {[
                { label: 'Groceries', val: '24', color: '#6366F1' },
                { label: 'Health',    val: '3',  color: '#F43F5E' },
                { label: 'Warranties', val: '8', color: '#F59E0B' },
                { label: 'Spent',     val: '₹340', color: '#059669' },
              ].map(({ label, val, color }) => (
                <div key={label} className="card card-sm">
                  <div className={`w-1 h-8 rounded-full mb-2`} style={{ background: color }} />
                  <p className="font-sans text-xs text-orbit-muted">{label}</p>
                  <p className="font-sans text-xl font-bold text-orbit-text">{val}</p>
                </div>
              ))}
              <div className="col-span-2 card card-sm">
                <p className="section-label mb-2">Smart Alerts</p>
                {['Milk expires in 2d · ?3.50 at risk', 'Groceries budget at 85%'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-orbit-border last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ background: i === 0 ? 'hsl(4 82% 58%)' : 'hsl(24 95% 48%)' }} />
                    <p className="font-sans text-xs text-orbit-muted">{t}</p>
                  </div>
                ))}
              </div>
              <div className="col-span-2 card card-sm">
                <p className="section-label mb-2">Household Health</p>
                {[
                  { label: 'Freshness', pct: 88, color: '#059669' },
                  { label: 'Budget',    pct: 62, color: '#6366F1' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-sans text-xs text-orbit-muted">{label}</span>
                      <span className="font-sans text-xs font-semibold text-orbit-text">{pct}%</span>
                    </div>
                    <div className="orbit-progress">
                      <div className={`orbit-progress-fill`} style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="absolute -left-8 top-16 animate-float hidden lg:block">
            <div className="card card-sm shadow-xl w-44">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center" style={{ background: 'hsl(4 82% 58% / 0.15)' }}>
                  <Shield className="w-3 h-3" style={{ color: 'hsl(4 82% 58%)' }} />
                </div>
                <p className="font-sans text-xs font-semibold text-orbit-text">Health Alert</p>
              </div>
              <p className="font-sans text-[11px] text-orbit-muted">Peanut allergy conflict detected in new item</p>
            </div>
          </div>
          <div className="absolute -right-8 bottom-16 animate-float-delay hidden lg:block">
            <div className="card card-sm shadow-xl w-44">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center" style={{ background: 'hsl(160 84% 39% / 0.15)' }}>
                  <Zap className="w-3 h-3" style={{ color: 'hsl(160 84% 39%)' }} />
                </div>
                <p className="font-sans text-xs font-semibold text-orbit-text">AI Insight</p>
              </div>
              <p className="font-sans text-[11px] text-orbit-muted">Saved ₹47 this week by using expiring items</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="border-y border-orbit-border" style={{ background: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }, i) => (
            <FadeIn key={label} delay={i * 0.08} className="text-center">
              <p className="font-display text-4xl italic gradient-text font-bold">{value}</p>
              <p className="font-sans text-sm text-orbit-muted mt-1">{label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <FadeIn className="text-center mb-14">
          <p className="section-label mb-3">Everything you need</p>
          <h2 className="font-display text-4xl font-bold italic text-orbit-text">One app for your entire home</h2>
          <p className="font-sans text-orbit-muted mt-3 max-w-xl mx-auto">
            From groceries to gadgets, health to finances — Orbit brings it all together with AI that actually understands your household.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }, i) => (
            <FadeIn key={title} delay={i * 0.07}>
              <div className="feature-card h-full">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-sans text-base font-semibold text-orbit-text mb-2">{title}</h3>
                <p className="font-sans text-sm text-orbit-muted leading-relaxed">{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <FadeIn>
          <div className="card card-lg"
            style={{ background: 'linear-gradient(135deg, hsl(231 84% 67% / 0.08), hsl(24 95% 48% / 0.05))', borderColor: 'hsl(231 84% 67% / 0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, hsl(231 84% 67%), hsl(221 83% 53%))' }}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold italic text-orbit-text mb-3">
              Ready to take control?
            </h2>
            <p className="font-sans text-orbit-muted mb-7 max-w-md mx-auto">
              Join thousands of households that use Orbit to reduce waste, save money, and live smarter.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => router.push('/auth?mode=signup')} className="btn-primary px-8 py-3 text-base gap-2">
                Create free account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => router.push('/auth?mode=login')} className="btn-ghost px-8 py-3 text-base">
                Sign in
              </button>
            </div>
            <div className="flex items-center justify-center gap-5 mt-6">
              {['No credit card', 'Free forever', 'Cancel anytime'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-orbit-success" />
                  <span className="font-sans text-xs text-orbit-muted">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-orbit-border py-8 px-6 text-center"
        style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(231 84% 67%), hsl(221 83% 53%))' }}>
            <span className="font-display text-white text-xs italic font-bold">O</span>
          </div>
          <span className="font-display text-base italic text-orbit-text">Orbit</span>
        </div>
        <p className="font-sans text-xs text-orbit-dim">© 2026 Orbit. Your household, intelligently managed.</p>
      </footer>
    </div>
  )
}



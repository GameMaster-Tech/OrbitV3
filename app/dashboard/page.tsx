'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ShoppingBasket, Heart, Shield, Wallet, RefreshCw, FlaskConical, CheckCircle, ArrowRight, ChefHat, BookOpen, Handshake } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SmartCard } from '@/components/ui/SmartCard'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useWallet } from '@/hooks/useWallet'
import { useSmartCards, useDerivedSmartCards } from '@/hooks/useSmartCards'
import { daysUntilExpiry } from '@/lib/utils'
import { getHealthProfile } from '@/lib/database'

const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

const OVERVIEW_CARDS = [
  {
    key: 'groceries', href: '/inventory', icon: ShoppingBasket, label: 'Groceries',
    gradient: 'linear-gradient(135deg, #2A2662 0%, #3F3AA2 100%)', border: 'rgba(99,102,241,0.38)',
    accent: '#818CF8', iconBg: 'rgba(99,102,241,0.2)',
  },
  {
    key: 'health', href: '/health', icon: Heart, label: 'Health',
    gradient: 'linear-gradient(135deg, #611129 0%, #9A1F4A 100%)', border: 'rgba(244,63,94,0.36)',
    accent: '#FB7185', iconBg: 'rgba(244,63,94,0.2)',
  },
  {
    key: 'warranties', href: '/inventory', icon: Shield, label: 'Warranties',
    gradient: 'linear-gradient(135deg, #5B2808 0%, #8A4415 100%)', border: 'rgba(245,158,11,0.36)',
    accent: '#FCD34D', iconBg: 'rgba(245,158,11,0.2)',
  },
  {
    key: 'wallet', href: '/wallet', icon: Wallet, label: 'Spent this month',
    gradient: 'linear-gradient(135deg, #0C4A27 0%, #1C6A42 100%)', border: 'rgba(16,185,129,0.36)',
    accent: '#6EE7B7', iconBg: 'rgba(16,185,129,0.2)',
  },
] as const

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile } = useAuthStore()
  const { items, zones } = useInventory(user?.uid)
  const { expenses, budgets } = useWallet(user?.uid)
  const { cards: firestoreCards, dismiss } = useSmartCards(user?.uid)
  const [dismissedDerivedIds, setDismissedDerivedIds] = useState<string[]>([])
  const [medicationCount, setMedicationCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    getHealthProfile(user.uid).then(p => {
      setMedicationCount(p?.medications?.length ?? 0)
    }).catch(() => setMedicationCount(0))
  }, [user?.uid])

  const derivedCards = useDerivedSmartCards(items, budgets)
  const visibleDerivedCards = useMemo(
    () => derivedCards.filter((card) => !dismissedDerivedIds.includes(card.id)),
    [derivedCards, dismissedDerivedIds],
  )
  const allCards = [...firestoreCards, ...visibleDerivedCards]

  const kitchenItems = items.filter((item) => item.tab === 'kitchen')
  const expiringItems = kitchenItems.filter((item) => {
    const expiry = item.adjustedExpiryDate ?? item.expiryDate
    if (!expiry) return false
    const days = daysUntilExpiry(expiry)
    return days >= 0 && days <= 3
  })
  const expiredItems = kitchenItems.filter((item) => {
    const expiry = item.adjustedExpiryDate ?? item.expiryDate
    if (!expiry) return false
    return daysUntilExpiry(expiry) < 0
  })

  const freshnessScore = kitchenItems.length > 0
    ? Math.round(((kitchenItems.length - expiredItems.length) / kitchenItems.length) * 100)
    : 100

  const warrantyItems = items.filter((item) => (item.tab === 'electronics' || item.tab === 'appliances') && item.warrantyExpiry)
  const expiringWarranties = warrantyItems.filter((item) => {
    const days = daysUntilExpiry(item.warrantyExpiry!)
    return days >= 0 && days <= 90
  })

  const totalMonthly = expenses
    .filter((expense) => {
      const d = new Date(expense.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  const budgetUsage = budgets.length > 0
    ? Math.min(100, Math.round((budgets.reduce((sum, budget) => sum + (budget.spent / budget.limit), 0) / budgets.length) * 100))
    : 0

  const atRiskValue = expiringItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)

  useEffect(() => {
    if (!user?.uid || expiringItems.length === 0 || typeof window === 'undefined') return

    const key = `smartpair_scan_${user.uid}`
    const lastScan = Number(window.localStorage.getItem(key) ?? 0)
    const now = Date.now()
    if (now - lastScan < 1000 * 60 * 20) return

    window.localStorage.setItem(key, String(now))
    fetch('/api/smart-pairing/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
    }).catch(() => {})
  }, [user?.uid, expiringItems.length])

  useEffect(() => {
    if (!user?.uid || typeof window === 'undefined') return

    const key = `dismissed_derived_cards_${user.uid}`
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(key)
        setDismissedDerivedIds(raw ? JSON.parse(raw) as string[] : [])
      } catch {
        setDismissedDerivedIds([])
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [user?.uid])

  const handleDismiss = async (cardId: string) => {
    if (firestoreCards.some((card) => card.id === cardId)) {
      await dismiss(cardId)
      return
    }

    setDismissedDerivedIds((prev) => {
      const next = prev.includes(cardId) ? prev : [...prev, cardId]
      if (typeof window !== 'undefined' && user?.uid) {
        window.localStorage.setItem(`dismissed_derived_cards_${user.uid}`, JSON.stringify(next))
      }
      return next
    })
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const cardValues: Record<string, { value: string; sub: React.ReactNode }> = {
    groceries: {
      value: String(kitchenItems.length),
      sub: expiringItems.length > 0
        ? <span style={{ color: '#FCD34D', fontWeight: 600 }}>{expiringItems.length} expiring{atRiskValue > 0 ? ` · \u20B9${atRiskValue.toFixed(0)} at risk` : ''}</span>
        : <span style={{ color: '#6EE7B7', fontWeight: 600 }}>{freshnessScore}% fresh</span>,
    },
    health: {
      value: medicationCount === null ? '—' : String(medicationCount),
      sub: <span style={{ color: 'rgba(255,255,255,0.5)' }}>medications active</span>,
    },
    warranties: {
      value: String(warrantyItems.length),
      sub: expiringWarranties.length > 0
        ? <span style={{ color: '#FCA5A5', fontWeight: 600 }}>{expiringWarranties.length} expiring in 90d</span>
        : <span style={{ color: 'rgba(255,255,255,0.5)' }}>items tracked</span>,
    },
    wallet: {
      value: `\u20B9${totalMonthly.toFixed(0)}`,
      sub: budgets.length > 0
        ? <span style={{ color: budgetUsage > 80 ? '#FCA5A5' : budgetUsage > 60 ? '#FCD34D' : '#6EE7B7', fontWeight: 600 }}>{budgetUsage}% of budget used</span>
        : <span style={{ color: 'rgba(255,255,255,0.5)' }}>no budgets set</span>,
    },
  }

  const quickLinks = [
    { label: 'Inventory', href: '/inventory', icon: ShoppingBasket, color: '#818CF8', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Health', href: '/health', icon: Heart, color: '#FB7185', bg: 'rgba(244,63,94,0.12)' },
    { label: 'Wallet', href: '/wallet', icon: Wallet, color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)' },
    { label: 'SwapSync', href: '/swapsync', icon: RefreshCw, color: '#67E8F9', bg: 'rgba(8,145,178,0.12)' },
    { label: 'Smart Pairing', href: '/smart-pairing', icon: Handshake, color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
    { label: 'Get Flavored', href: '/get-flavored', icon: ChefHat, color: '#F97316', bg: 'rgba(249,115,22,0.14)' },
    { label: 'Library', href: '/library', icon: BookOpen, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Household Sim', href: '/sandbox', icon: FlaskConical, color: '#FCD34D', bg: 'rgba(245,158,11,0.12)' },
  ]

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${greeting()}, ${profile?.displayName?.split(' ')[0] ?? 'there'}`}
      smartCards={allCards}
      onDismissCard={handleDismiss}
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-7 max-w-5xl mx-auto">
        <motion.div variants={fadeUp}>
          <p className="section-label mb-3">Overview</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {OVERVIEW_CARDS.map((card) => {
              const Icon = card.icon
              const valueMeta = cardValues[card.key]
              return (
                <button
                  key={card.key}
                  onClick={() => router.push(card.href)}
                  className="relative overflow-hidden rounded-2xl p-4 text-left group transition-all hover:-translate-y-1"
                  style={{ background: card.gradient, border: `1px solid ${card.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${card.accent}, transparent)` }} />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.iconBg }}>
                      <Icon className="w-4 h-4" style={{ color: card.accent }} />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: card.accent }} />
                  </div>
                  <p className="font-sans text-xs font-semibold uppercase tracking-wide mb-1 relative z-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {card.label}
                  </p>
                  <p className="font-sans text-3xl font-bold tracking-tight relative z-10" style={{ color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                    {valueMeta.value}
                  </p>
                  <p className="font-sans text-xs mt-2 relative z-10">{valueMeta.sub}</p>
                </button>
              )
            })}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-5">
          <motion.div variants={fadeUp} className="md:col-span-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="section-label">Smart Alerts</p>
              {allCards.length > 0 && <span className="badge badge-critical">{allCards.length}</span>}
            </div>
            {allCards.length === 0 ? (
              <div className="card card-md flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(5,150,105,0.12)' }}>
                  <CheckCircle className="w-6 h-6" style={{ color: '#059669' }} />
                </div>
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>All clear</p>
                <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>No active alerts right now</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {allCards.slice(0, 6).map((card) => (
                    <SmartCard key={card.id} card={card} onDismiss={handleDismiss} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="md:col-span-2 flex flex-col gap-5">
            <div>
              <p className="section-label mb-3">Household Health</p>
              <div className="card card-md space-y-4">
                {[
                  { label: 'Grocery Freshness', value: freshnessScore, color: '#059669' },
                  { label: 'Storage Zones', value: zones.length > 0 ? Math.max(0, 100 - zones.reduce((sum, zone) => sum + (zone.spoilageCount ?? 0), 0) * 5) : 100, color: '#6366F1' },
                  { label: 'Budget Usage', value: budgetUsage, color: budgetUsage > 80 ? '#DC2626' : budgetUsage > 60 ? '#D97706' : '#059669' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
                      <span className="font-sans text-sm font-semibold" style={{ color }}>{value}%</span>
                    </div>
                    <div className="orbit-progress">
                      <div className="orbit-progress-fill" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="section-label mb-3">Quick Access</p>
              <div className="grid grid-cols-3 gap-2">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <button
                      key={link.href}
                      onClick={() => router.push(link.href)}
                      className="card card-sm card-hover flex flex-col items-center gap-2 text-center py-3"
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: link.bg }}>
                        <Icon className="w-4 h-4" style={{ color: link.color }} />
                      </div>
                      <span className="font-sans text-xs font-medium leading-tight" style={{ color: 'var(--muted)' }}>
                        {link.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  )
}

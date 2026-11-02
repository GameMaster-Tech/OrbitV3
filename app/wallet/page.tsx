'use client'
import { useState, useEffect, type ComponentType, type SVGProps } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Plus, X, DollarSign, TrendingUp, TrendingDown,
  ShoppingCart, Heart, Zap, Cpu, Car, Utensils,
  Music, Package, MoreHorizontal, ArrowUpRight,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, getBudgetStatus } from '@/lib/utils'
import type { ExpenseCategory, BudgetPeriod } from '@/types'

const CATEGORIES: ExpenseCategory[] = ['groceries','healthcare','utilities','electronics','entertainment','transport','dining','shopping','other']

const CAT_META: Record<string, { icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; bg: string }> = {
  groceries:     { icon: ShoppingCart, color: '#6366F1', bg: 'rgba(99,102,241,0.12)'  },
  healthcare:    { icon: Heart,        color: '#F43F5E', bg: 'rgba(244,63,94,0.12)'   },
  utilities:     { icon: Zap,          color: '#D97706', bg: 'rgba(217,119,6,0.12)'   },
  electronics:   { icon: Cpu,          color: '#0891B2', bg: 'rgba(8,145,178,0.12)'   },
  entertainment: { icon: Music,        color: '#A855F7', bg: 'rgba(168,85,247,0.12)'  },
  transport:     { icon: Car,          color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  dining:        { icon: Utensils,     color: '#EA580C', bg: 'rgba(234,88,12,0.12)'   },
  shopping:      { icon: Package,      color: '#0284C7', bg: 'rgba(2,132,199,0.12)'   },
  other:         { icon: MoreHorizontal,color:'#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

export default function WalletPage() {
  const { user } = useAuthStore()
  const { wallet, expenses, budgets, addExpenseEntry, saveBudgetEntry, getSpentByCategory } = useWallet(user?.uid)

  // One-time backfill: sync existing inventory items that have prices but no expense record
  useEffect(() => {
    if (!user?.uid) return
    const key = `expense_sync_done_${user.uid}`
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(key)) return
    fetch('/api/sync-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
    }).then(async (res) => {
      const data = await res.json()
      if (data.synced > 0) console.log(`[wallet] Backfilled ${data.synced} expenses from inventory`)
      if (typeof window !== 'undefined') window.sessionStorage.setItem(key, '1')
    }).catch(() => {})
  }, [user?.uid])

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddBudget, setShowAddBudget]   = useState(false)
  const [expAmount, setExpAmount]     = useState('')
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('groceries')
  const [expDesc, setExpDesc]         = useState('')
  const [budCategory, setBudCategory] = useState<ExpenseCategory>('groceries')
  const [budLimit, setBudLimit]       = useState('')
  const [budPeriod, setBudPeriod]     = useState<BudgetPeriod>('monthly')

  const now = new Date()
  const totalMonthly = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, e) => s + e.amount, 0)

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0)

  // Spending by category this month
  const catSpend = CATEGORIES.map(cat => ({
    cat,
    amount: expenses.filter(e => {
      const d = new Date(e.date)
      return e.category === cat && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

  const maxCatSpend = catSpend[0]?.amount || 1

  const handleAddExpense = async () => {
    if (!expAmount || !expDesc) return
    await addExpenseEntry({ amount: parseFloat(expAmount), category: expCategory, description: expDesc, date: new Date() })
    setExpAmount(''); setExpDesc(''); setShowAddExpense(false)
  }

  const handleAddBudget = async () => {
    if (!budLimit) return
    await saveBudgetEntry({ category: budCategory, limit: parseFloat(budLimit), period: budPeriod, spent: getSpentByCategory(budCategory, budPeriod) })
    setBudLimit(''); setShowAddBudget(false)
  }

  return (
    <AppShell title="Wallet" subtitle="Budget tracking & expense management">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto">

        {/* Hero stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly spend — hero card */}
          <div className="md:col-span-1 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            <p className="font-sans text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">This Month</p>
            <p className="font-sans text-3xl font-bold text-white tracking-tight">{formatCurrency(totalMonthly)}</p>
            <p className="font-sans text-xs text-white/50 mt-1">
              {expenses.filter(e => {
                const d = new Date(e.date)
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              }).length} transactions
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <TrendingUp className="w-3.5 h-3.5 text-white/60" />
              <span className="font-sans text-xs text-white/60">Total all time: {formatCurrency(totalAll)}</span>
            </div>
          </div>

          {/* Credits */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 8px 32px rgba(5,150,105,0.3)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            <p className="font-sans text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">SwapSync Credits</p>
            <p className="font-sans text-3xl font-bold text-white tracking-tight">{wallet?.balance ?? 0} <span className="text-lg">◈</span></p>
            <p className="font-sans text-xs text-white/50 mt-1">Earned: {wallet?.totalEarned ?? 0} ◈</p>
            <div className="flex items-center gap-1.5 mt-3">
              <ArrowUpRight className="w-3.5 h-3.5 text-white/60" />
              <span className="font-sans text-xs text-white/60">Spent: {wallet?.totalSpent ?? 0} ◈</span>
            </div>
          </div>

          {/* Active budgets */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', boxShadow: '0 8px 32px rgba(217,119,6,0.3)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            <p className="font-sans text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Active Budgets</p>
            <p className="font-sans text-3xl font-bold text-white tracking-tight">{budgets.length}</p>
            <p className="font-sans text-xs text-white/50 mt-1">
              {budgets.filter(b => getSpentByCategory(b.category, b.period) >= b.limit).length} exceeded
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <TrendingDown className="w-3.5 h-3.5 text-white/60" />
              <span className="font-sans text-xs text-white/60">Track your spending limits</span>
            </div>
          </div>
        </motion.div>

        {/* Spending by category */}
        {catSpend.length > 0 && (
          <motion.div variants={fadeUp}>
            <p className="section-label mb-3">Spending this month</p>
            <div className="card card-md">
              <div className="space-y-3">
                {catSpend.slice(0, 6).map(({ cat, amount }, i) => {
                  const meta = CAT_META[cat] || CAT_META.other
                  const Icon = meta.icon
                  const pct = (amount / maxCatSpend) * 100
                  return (
                    <motion.div key={cat}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-sans text-sm font-medium capitalize" style={{ color: 'var(--text)' }}>{cat}</span>
                          <span className="font-sans text-sm font-bold" style={{ color: meta.color }}>{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--elevated)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: meta.color }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Expenses */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Recent Expenses</p>
              <button onClick={() => setShowAddExpense(true)} className="btn-primary gap-1.5 text-sm py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="card card-md text-center py-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <DollarSign className="w-6 h-6" style={{ color: '#6366F1' }} />
                  </div>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>No expenses yet</p>
                  <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>Start tracking your spending</p>
                </div>
              ) : (
                <AnimatePresence>
                  {expenses.slice(0, 8).map((exp, i) => {
                    const meta = CAT_META[exp.category] || CAT_META.other
                    const Icon = meta.icon
                    return (
                      <motion.div key={exp.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="card card-sm flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{exp.description}</p>
                          <span className="badge badge-muted text-[10px]">{exp.category}</span>
                        </div>
                        <p className="font-sans text-sm font-bold shrink-0" style={{ color: meta.color }}>{formatCurrency(exp.amount)}</p>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Budgets */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Budgets</p>
              <button onClick={() => setShowAddBudget(true)} className="btn-ghost gap-1.5 text-sm py-1.5">
                <Plus className="w-3.5 h-3.5" /> Set Budget
              </button>
            </div>
            <div className="space-y-2">
              {budgets.length === 0 ? (
                <div className="card card-md text-center py-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(217,119,6,0.1)' }}>
                    <TrendingUp className="w-6 h-6" style={{ color: '#D97706' }} />
                  </div>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>No budgets set</p>
                  <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>Set limits to control spending</p>
                </div>
              ) : (
                <AnimatePresence>
                  {budgets.map((budget, i) => {
                    const spent = getSpentByCategory(budget.category, budget.period)
                    const status = getBudgetStatus(spent, budget.limit)
                    const pct = Math.min(100, (spent / budget.limit) * 100)
                    const barColor = status === 'exceeded' ? '#DC2626' : status === 'warning' ? '#D97706' : '#059669'
                    const meta = CAT_META[budget.category] || CAT_META.other
                    const Icon = meta.icon
                    return (
                      <motion.div key={budget.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="card card-sm hover:-translate-y-0.5 transition-transform">
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-sm font-semibold capitalize" style={{ color: 'var(--text)' }}>{budget.category}</p>
                            <p className="font-sans text-[10px] capitalize" style={{ color: 'var(--dim)' }}>{budget.period}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-sans text-sm font-bold" style={{ color: barColor }}>{formatCurrency(spent)}</p>
                            <p className="font-sans text-[10px]" style={{ color: 'var(--dim)' }}>of {formatCurrency(budget.limit)}</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--elevated)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: barColor }}
                          />
                        </div>
                        <p className="font-sans text-[10px] mt-1.5 text-right" style={{ color: 'var(--dim)' }}>{pct.toFixed(0)}% used</p>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAddExpense(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="card card-lg w-full max-w-sm" style={{ boxShadow: '0 24px 64px rgba(15,17,23,0.2)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>Add Expense</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Track a new spending entry</p>
                </div>
                <button onClick={() => setShowAddExpense(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--dim)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Category picker */}
              <div className="mb-4">
                <label className="font-sans text-xs font-semibold mb-2 block" style={{ color: 'var(--muted)' }}>Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.slice(0, 9).map(cat => {
                    const meta = CAT_META[cat] || CAT_META.other
                    const Icon = meta.icon
                    const isSelected = expCategory === cat
                    return (
                      <button key={cat} type="button" onClick={() => setExpCategory(cat)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all text-xs font-medium capitalize"
                        style={isSelected
                          ? { background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}` }
                          : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}>
                        <Icon className="w-4 h-4" />
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Amount</label>
                  <input value={expAmount} onChange={e => setExpAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" className="orbit-input" />
                </div>
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Description</label>
                  <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="What did you spend on?" className="orbit-input" />
                </div>
                <button onClick={handleAddExpense} disabled={!expAmount || !expDesc} className="btn-primary w-full py-2.5 disabled:opacity-40">
                  Add Expense
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Budget Modal */}
      <AnimatePresence>
        {showAddBudget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAddBudget(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="card card-lg w-full max-w-sm" style={{ boxShadow: '0 24px 64px rgba(15,17,23,0.2)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>Set Budget</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Define a spending limit</p>
                </div>
                <button onClick={() => setShowAddBudget(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--dim)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-4">
                <label className="font-sans text-xs font-semibold mb-2 block" style={{ color: 'var(--muted)' }}>Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.slice(0, 9).map(cat => {
                    const meta = CAT_META[cat] || CAT_META.other
                    const Icon = meta.icon
                    const isSelected = budCategory === cat
                    return (
                      <button key={cat} type="button" onClick={() => setBudCategory(cat)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all text-xs font-medium capitalize"
                        style={isSelected
                          ? { background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}` }
                          : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}>
                        <Icon className="w-4 h-4" />
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Budget limit</label>
                  <input value={budLimit} onChange={e => setBudLimit(e.target.value)} type="number" step="0.01" placeholder="0.00" className="orbit-input" />
                </div>
                <div>
                  <label className="font-sans text-xs font-semibold mb-2 block" style={{ color: 'var(--muted)' }}>Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['daily','weekly','monthly'] as BudgetPeriod[]).map(p => (
                      <button key={p} type="button" onClick={() => setBudPeriod(p)}
                        className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                        style={budPeriod === p
                          ? { background: 'rgba(99,102,241,0.12)', color: '#6366F1', border: '1.5px solid rgba(99,102,241,0.4)' }
                          : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleAddBudget} disabled={!budLimit} className="btn-primary w-full py-2.5 disabled:opacity-40">
                  Set Budget
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}


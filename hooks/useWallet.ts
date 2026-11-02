'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { listenWallet, listenExpenses, listenBudgets, addExpense, saveBudget } from '@/lib/firestore'
import type { UserWallet, Expense, Budget, ExpenseCategory } from '@/types'

export function useWallet(uid: string | undefined) {
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  // Keep a ref to budgets so callbacks always see the latest value
  const budgetsRef = useRef<Budget[]>([])
  useEffect(() => {
    budgetsRef.current = budgets
  }, [budgets])

  useEffect(() => {
    let active = true

    if (!uid) {
      const timer = setTimeout(() => {
        if (active) {
          setLoading(false)
          setWallet(null)
          setExpenses([])
          setBudgets([])
        }
      }, 0)
      return () => {
        active = false
        clearTimeout(timer)
      }
    }

    const loadTimer = setTimeout(() => {
      if (active) setLoading(true)
    }, 0)

    const unsubWallet   = listenWallet(uid, (w) => { if (active) { setWallet(w); setLoading(false) } })
    const unsubExpenses = listenExpenses(uid, (e) => { if (active) setExpenses(e) })
    const unsubBudgets  = listenBudgets(uid, (b) => { if (active) setBudgets(b) })

    return () => {
      active = false
      clearTimeout(loadTimer)
      unsubWallet()
      unsubExpenses()
      unsubBudgets()
    }
  }, [uid])

  const getSpentByCategory = useCallback(
    (category: ExpenseCategory, period: 'daily' | 'weekly' | 'monthly'): number => {
      const now = new Date()
      return expenses
        .filter((e) => {
          if (e.category !== category) return false
          const d = new Date(e.date)
          if (period === 'daily')   return d.toDateString() === now.toDateString()
          if (period === 'weekly') {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - 7)
            return d >= weekStart
          }
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        .reduce((sum, e) => sum + e.amount, 0)
    },
    [expenses]
  )

  const addExpenseEntry = useCallback(
    async (expense: Omit<Expense, 'id'>) => {
      if (!uid) return
      await addExpense(uid, expense)
      // Listener will auto-update expenses state — no manual refetch needed.
      // Update matching budget's spent using the latest expenses + new entry.
      const matchingBudget = budgetsRef.current.find((b) => b.category === expense.category)
      if (matchingBudget) {
        const now = new Date()
        const currentSpent = expenses
          .filter((e) => {
            if (e.category !== matchingBudget.category) return false
            const d = new Date(e.date)
            if (matchingBudget.period === 'daily')  return d.toDateString() === now.toDateString()
            if (matchingBudget.period === 'weekly') {
              const weekStart = new Date(now)
              weekStart.setDate(now.getDate() - 7)
              return d >= weekStart
            }
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          })
          .reduce((sum, e) => sum + e.amount, 0)
        // Add the new expense amount (not yet in state since listener hasn't fired)
        await saveBudget(uid, { ...matchingBudget, spent: currentSpent + expense.amount })
        // Budget listener will auto-update budgets state
      }
    },
    [uid, expenses]
  )

  const saveBudgetEntry = useCallback(
    async (budget: Omit<Budget, 'id'>) => {
      if (!uid) return
      // Compute current spent from live expenses
      const now = new Date()
      const computedSpent = expenses
        .filter((e) => {
          if (e.category !== budget.category) return false
          const d = new Date(e.date)
          if (budget.period === 'daily')  return d.toDateString() === now.toDateString()
          if (budget.period === 'weekly') {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - 7)
            return d >= weekStart
          }
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        .reduce((sum, e) => sum + e.amount, 0)
      await saveBudget(uid, { ...budget, spent: computedSpent })
      // Budget listener will auto-update budgets state
    },
    [uid, expenses]
  )

  return {
    wallet:   uid ? wallet   : null,
    expenses: uid ? expenses : [],
    budgets:  uid ? budgets  : [],
    loading:  uid ? loading  : false,
    addExpenseEntry,
    saveBudgetEntry,
    getSpentByCategory,
  }
}

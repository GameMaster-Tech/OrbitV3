// Tests for wallet/expense logic
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ---- inline expense category mapping ----

type InventoryTab = 'kitchen' | 'electronics' | 'appliances' | 'documents'
type ExpenseCategory = 'groceries' | 'electronics' | 'utilities' | 'other' | 'shopping'

const TAB_TO_CATEGORY: Record<InventoryTab, ExpenseCategory> = {
  kitchen:     'groceries',
  electronics: 'electronics',
  appliances:  'utilities',
  documents:   'other',
}

function mapTabToExpenseCategory(tab: InventoryTab): ExpenseCategory {
  return TAB_TO_CATEGORY[tab] ?? 'shopping'
}

// ---- inline spent computation ----

interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  date: Date
}

function computeSpent(
  expenses: Expense[],
  category: ExpenseCategory,
  period: 'daily' | 'weekly' | 'monthly',
): number {
  const now = new Date()
  return expenses
    .filter(e => {
      if (e.category !== category) return false
      const d = new Date(e.date)
      if (period === 'daily')   return d.toDateString() === now.toDateString()
      if (period === 'weekly') {
        const ws = new Date(now); ws.setDate(now.getDate() - 7)
        return d >= ws
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)
}

// ---- tests ----

describe('inventory tab → expense category mapping', () => {
  it('maps kitchen to groceries', () => {
    assert.equal(mapTabToExpenseCategory('kitchen'), 'groceries')
  })
  it('maps electronics to electronics', () => {
    assert.equal(mapTabToExpenseCategory('electronics'), 'electronics')
  })
  it('maps appliances to utilities', () => {
    assert.equal(mapTabToExpenseCategory('appliances'), 'utilities')
  })
  it('maps documents to other', () => {
    assert.equal(mapTabToExpenseCategory('documents'), 'other')
  })
})

describe('computeSpent', () => {
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  // Force a different month/year regardless of current month
  const lastMonth = new Date(2020, 0, 15) // Jan 2020 — always a different month

  const expenses: Expense[] = [
    { id: '1', category: 'groceries', amount: 500,  date: now },
    { id: '2', category: 'groceries', amount: 300,  date: now },
    { id: '3', category: 'groceries', amount: 200,  date: yesterday },
    { id: '4', category: 'groceries', amount: 1000, date: lastMonth },
    { id: '5', category: 'electronics', amount: 5000, date: now },
  ]

  it('monthly: sums only this month expenses for the category', () => {
    const spent = computeSpent(expenses, 'groceries', 'monthly')
    // today(500+300) + yesterday(200) = 1000 — lastMonth(Jan 2020) is excluded
    assert.equal(spent, 1000)
  })

  it('daily: sums only today expenses', () => {
    const spent = computeSpent(expenses, 'groceries', 'daily')
    assert.equal(spent, 800) // 500+300 from today
  })

  it('ignores other categories', () => {
    const spent = computeSpent(expenses, 'groceries', 'monthly')
    assert.ok(spent < 5000) // electronics entry not included
  })

  it('returns 0 when no matching expenses', () => {
    assert.equal(computeSpent(expenses, 'utilities', 'monthly'), 0)
  })
})

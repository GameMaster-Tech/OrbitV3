// Tests for smart alert generation logic
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ---- inline budget alert logic ----

function getBudgetAlerts(budgets: { id: string; category: string; spent: number; limit: number; period: string }[]) {
  const alerts: { type: string; priority: string; category: string }[] = []
  for (const b of budgets) {
    const ratio = b.spent / b.limit
    if (ratio >= 1) {
      alerts.push({ type: 'budgetAllocation', priority: 'high', category: b.category })
    } else if (ratio >= 0.8) {
      alerts.push({ type: 'budgetAllocation', priority: 'medium', category: b.category })
    }
  }
  return alerts
}

// ---- inline expiry alert logic ----

function getExpiryPriority(days: number): string | null {
  if (days < 0) return 'high'       // expired
  if (days === 0) return 'critical' // expiring today
  if (days <= 3) return 'high'      // expiring soon
  if (days <= 7) return 'medium'    // use this week
  return null                       // no alert
}

// ---- tests ----

describe('budget alert generation', () => {
  it('generates high alert when budget is exceeded', () => {
    const alerts = getBudgetAlerts([{ id: '1', category: 'groceries', spent: 1100, limit: 1000, period: 'monthly' }])
    assert.equal(alerts.length, 1)
    assert.equal(alerts[0].priority, 'high')
  })

  it('generates medium alert at 80% usage', () => {
    const alerts = getBudgetAlerts([{ id: '1', category: 'groceries', spent: 800, limit: 1000, period: 'monthly' }])
    assert.equal(alerts.length, 1)
    assert.equal(alerts[0].priority, 'medium')
  })

  it('generates no alert below 80%', () => {
    const alerts = getBudgetAlerts([{ id: '1', category: 'groceries', spent: 700, limit: 1000, period: 'monthly' }])
    assert.equal(alerts.length, 0)
  })

  it('handles multiple budgets independently', () => {
    const alerts = getBudgetAlerts([
      { id: '1', category: 'groceries', spent: 1200, limit: 1000, period: 'monthly' },
      { id: '2', category: 'dining',    spent: 400,  limit: 1000, period: 'monthly' },
      { id: '3', category: 'utilities', spent: 850,  limit: 1000, period: 'monthly' },
    ])
    assert.equal(alerts.length, 2) // exceeded + warning
    assert.ok(alerts.some(a => a.priority === 'high'))
    assert.ok(alerts.some(a => a.priority === 'medium'))
  })
})

describe('expiry priority logic', () => {
  it('returns critical for items expiring today', () => {
    assert.equal(getExpiryPriority(0), 'critical')
  })
  it('returns high for items expiring in 1-3 days', () => {
    assert.equal(getExpiryPriority(1), 'high')
    assert.equal(getExpiryPriority(3), 'high')
  })
  it('returns medium for items expiring in 4-7 days', () => {
    assert.equal(getExpiryPriority(4), 'medium')
    assert.equal(getExpiryPriority(7), 'medium')
  })
  it('returns null for items with more than 7 days', () => {
    assert.equal(getExpiryPriority(8), null)
    assert.equal(getExpiryPriority(30), null)
  })
  it('returns high for already-expired items', () => {
    assert.equal(getExpiryPriority(-1), 'high')
    assert.equal(getExpiryPriority(-10), 'high')
  })
})

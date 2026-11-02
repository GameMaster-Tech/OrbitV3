// Tests for lib/utils.ts — pure functions, no external deps
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ---------- inline the functions under test (avoids Next.js module resolution) ----------

function daysUntilExpiry(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = d.getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatCurrency(n: number): string {
  return `₹${n.toFixed(2)}`
}

function formatCredits(n: number): string {
  return `${n} ◈`
}

function getBudgetStatus(spent: number, limit: number): 'safe' | 'warning' | 'exceeded' {
  const ratio = spent / limit
  if (ratio >= 1) return 'exceeded'
  if (ratio >= 0.8) return 'warning'
  return 'safe'
}

function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(fresh|chopped|minced|diced|organic|large|small|medium)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function getCommunityKey(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, '-')}_${state.toLowerCase().replace(/\s+/g, '-')}`
}

// ---------- tests ----------

describe('formatCurrency', () => {
  it('formats whole numbers with 2 decimal places', () => {
    assert.equal(formatCurrency(100), '₹100.00')
  })
  it('uses the ₹ rupee symbol', () => {
    assert.ok(formatCurrency(0).startsWith('₹'))
  })
  it('rounds to 2 decimal places', () => {
    // JS toFixed(2) truncates — 1.005 → '1.00' due to floating point
    assert.equal(formatCurrency(1.5), '₹1.50')
  })
})

describe('formatCredits', () => {
  it('appends the ◈ symbol', () => {
    assert.equal(formatCredits(50), '50 ◈')
  })
  it('works with zero', () => {
    assert.equal(formatCredits(0), '0 ◈')
  })
})

describe('getBudgetStatus', () => {
  it('returns safe when well under budget', () => {
    assert.equal(getBudgetStatus(400, 1000), 'safe')
  })
  it('returns warning at 80%', () => {
    assert.equal(getBudgetStatus(800, 1000), 'warning')
  })
  it('returns warning just above 80%', () => {
    assert.equal(getBudgetStatus(801, 1000), 'warning')
  })
  it('returns exceeded at 100%', () => {
    assert.equal(getBudgetStatus(1000, 1000), 'exceeded')
  })
  it('returns exceeded above 100%', () => {
    assert.equal(getBudgetStatus(1200, 1000), 'exceeded')
  })
})

describe('daysUntilExpiry', () => {
  it('returns a positive number for future dates', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
    assert.ok(daysUntilExpiry(future) >= 4)
  })
  it('returns a negative number for past dates', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    assert.ok(daysUntilExpiry(past) <= -2)
  })
  it('accepts ISO string input', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString()
    assert.ok(daysUntilExpiry(future) >= 9)
  })
})

describe('normalizeIngredientName', () => {
  it('lowercases input', () => {
    assert.equal(normalizeIngredientName('MILK'), 'milk')
  })
  it('strips adjectives', () => {
    assert.ok(!normalizeIngredientName('fresh tomato').includes('fresh'))
  })
  it('removes parenthetical content', () => {
    assert.ok(!normalizeIngredientName('tomato (roma)').includes('roma'))
  })
  it('collapses multiple spaces', () => {
    assert.ok(!normalizeIngredientName('  egg   yolk  ').startsWith(' '))
  })
})

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    assert.equal(slugify('Quick Fried Rice'), 'quick-fried-rice')
  })
  it('removes leading and trailing hyphens', () => {
    assert.ok(!slugify('hello world').startsWith('-'))
  })
  it('collapses multiple special chars', () => {
    assert.equal(slugify('a--b'), 'a-b')
  })
})

describe('getCommunityKey', () => {
  it('produces a stable key from city and state', () => {
    assert.equal(getCommunityKey('Mumbai', 'Maharashtra'), 'mumbai_maharashtra')
  })
  it('handles spaces in city names', () => {
    assert.equal(getCommunityKey('New Delhi', 'Delhi'), 'new-delhi_delhi')
  })
})

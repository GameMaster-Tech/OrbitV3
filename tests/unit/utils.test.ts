import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  daysUntilExpiry,
  formatRelativeDate,
  formatCredits,
  formatCurrency,
  getBudgetStatus,
  normalizeIngredientName,
  slugify,
  getCommunityKey,
} from '../../lib/utils.ts'

describe('lib/utils', () => {
  describe('daysUntilExpiry', () => {
    it('calculates future dates as positive days', () => {
      const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1000)
      assert.strictEqual(daysUntilExpiry(inTwoDays), 2)
    })

    it('calculates past dates as negative days', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000)
      assert.strictEqual(daysUntilExpiry(threeDaysAgo), -4)
    })
  })

  describe('formatRelativeDate', () => {
    it('formats today correctly', () => {
      const today = new Date(Date.now() + 1000 * 60)
      assert.strictEqual(formatRelativeDate(today), 'Today')
    })

    it('formats tomorrow correctly', () => {
      const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000)
      assert.strictEqual(formatRelativeDate(tomorrow), 'Tomorrow')
    })
  })

  describe('formatCredits & formatCurrency', () => {
    it('formats credit tokens with diamond symbol', () => {
      assert.strictEqual(formatCredits(50), '50 ◈')
      assert.strictEqual(formatCredits(0), '0 ◈')
    })

    it('formats INR currency with rupee symbol', () => {
      assert.strictEqual(formatCurrency(150), '₹150.00')
      assert.strictEqual(formatCurrency(99.5), '₹99.50')
    })
  })

  describe('getBudgetStatus', () => {
    it('returns safe when spent is below 80% of limit', () => {
      assert.strictEqual(getBudgetStatus(500, 1000), 'safe')
      assert.strictEqual(getBudgetStatus(790, 1000), 'safe')
    })

    it('returns warning when spent is between 80% and 99% of limit', () => {
      assert.strictEqual(getBudgetStatus(800, 1000), 'warning')
      assert.strictEqual(getBudgetStatus(950, 1000), 'warning')
    })

    it('returns exceeded when spent is 100% or more of limit', () => {
      assert.strictEqual(getBudgetStatus(1000, 1000), 'exceeded')
      assert.strictEqual(getBudgetStatus(1200, 1000), 'exceeded')
    })
  })

  describe('normalizeIngredientName', () => {
    it('strips parenthesis, adjectives, and extra whitespace', () => {
      assert.strictEqual(normalizeIngredientName('Fresh Organic Tomatoes (Large)'), 'tomatoes')
      assert.strictEqual(normalizeIngredientName('Chopped Garlic (Minced)'), 'garlic')
    })
  })

  describe('slugify & getCommunityKey', () => {
    it('creates URL-friendly slugs', () => {
      assert.strictEqual(slugify('Pasta Arrabbiata! #1'), 'pasta-arrabbiata-1')
    })

    it('creates deterministic community keys from city and state', () => {
      assert.strictEqual(getCommunityKey('New Delhi', 'Delhi'), 'new-delhi_delhi')
      assert.strictEqual(getCommunityKey('Bengaluru ', ' Karnataka'), 'bengaluru_karnataka')
    })
  })
})

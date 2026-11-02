import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_ZONES,
  getRecommendedZone,
  calculateAdjustedExpiry,
} from '../../lib/zoneService.ts'

describe('lib/zoneService', () => {
  describe('DEFAULT_ZONES', () => {
    it('defines the 6 household storage zones', () => {
      assert.strictEqual(DEFAULT_ZONES.length, 6)
      const names = DEFAULT_ZONES.map((z) => z.name)
      assert.ok(names.includes('Main Fridge'))
      assert.ok(names.includes('Crisper Drawer'))
      assert.ok(names.includes('Fruit Drawer'))
      assert.ok(names.includes('Freezer'))
      assert.ok(names.includes('Pantry'))
      assert.ok(names.includes('Counter'))
    })

    it('has valid temperature and decay parameters', () => {
      for (const zone of DEFAULT_ZONES) {
        assert.ok(zone.decayMultiplier > 0 && zone.decayMultiplier <= 2.0)
        assert.ok(['freezer', 'refrigerator', 'room', 'warm'].includes(zone.temperature))
        assert.ok(['low', 'medium', 'high'].includes(zone.humidity))
      }
    })
  })

  describe('getRecommendedZone', () => {
    it('maps produce and vegetables to Crisper Drawer', () => {
      assert.strictEqual(getRecommendedZone('produce'), 'Crisper Drawer')
      assert.strictEqual(getRecommendedZone('vegetables'), 'Crisper Drawer')
    })

    it('maps dairy and meat to Main Fridge', () => {
      assert.strictEqual(getRecommendedZone('dairy'), 'Main Fridge')
      assert.strictEqual(getRecommendedZone('meat'), 'Main Fridge')
    })

    it('maps bread and bananas to Counter', () => {
      assert.strictEqual(getRecommendedZone('bread'), 'Counter')
      assert.strictEqual(getRecommendedZone('bananas'), 'Counter')
    })

    it('defaults unknown category to Pantry', () => {
      assert.strictEqual(getRecommendedZone('unknown_cat'), 'Pantry')
    })
  })

  describe('calculateAdjustedExpiry', () => {
    it('handles already expired items gracefully', () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24)
      const adj = calculateAdjustedExpiry(past, 1.0)
      assert.strictEqual(adj.daysAdjusted, 0)
      assert.strictEqual(adj.reason, 'Item already expired')
    })

    it('extends shelf-life in freezer conditions', () => {
      const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      const adj = calculateAdjustedExpiry(inFiveDays, 0.2, {
        temperature: 'freezer',
        humidity: 'low',
        category: 'frozen',
      })
      // Adjusted expiry date should be further in the future
      assert.ok(adj.adjustedExpiry.getTime() > inFiveDays.getTime())
      assert.ok(adj.daysAdjusted < 0) // daysAdjusted is negative when expiry is extended
    })

    it('shortens shelf-life in warm high-humidity conditions', () => {
      const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      const adj = calculateAdjustedExpiry(inFiveDays, 1.5, {
        temperature: 'warm',
        humidity: 'high',
        category: 'dairy',
      })
      // Adjusted expiry date should be sooner
      assert.ok(adj.adjustedExpiry.getTime() < inFiveDays.getTime())
    })
  })
})

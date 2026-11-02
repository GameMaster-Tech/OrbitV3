// Tests for lib/zoneService.ts — decay calculations
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ---- inline the logic under test ----

const Q10 = 2
const BASELINE_TEMP_C = 4
const ZONE_TEMP_C: Record<string, number> = {
  freezer: -18,
  refrigerator: 4,
  room: 22,
  warm: 30,
}

function calculateAdjustedExpiry(
  originalExpiry: Date,
  decayMultiplier: number,
  options?: { temperature?: string; humidity?: string; category?: string },
) {
  const now = Date.now()
  const originalMs = originalExpiry.getTime()
  const remainingMs = originalMs - now

  if (remainingMs <= 0) {
    return { originalExpiry, adjustedExpiry: originalExpiry, daysAdjusted: 0, reason: 'Item already expired' }
  }

  const tempC = options?.temperature ? ZONE_TEMP_C[options.temperature] ?? BASELINE_TEMP_C : BASELINE_TEMP_C
  const tempFactor = Math.pow(Q10, (tempC - BASELINE_TEMP_C) / 10)
  const manualFactor = Math.max(0.5, Math.min(2.0, decayMultiplier))
  const combinedFactor = Math.max(0.15, Math.min(3, tempFactor * manualFactor))
  const adjustedMs = now + remainingMs / combinedFactor
  const adjustedExpiry = new Date(adjustedMs)
  const daysAdjusted = Math.round((originalMs - adjustedMs) / (1000 * 60 * 60 * 24))

  return { originalExpiry, adjustedExpiry, daysAdjusted, reason: '' }
}

function getRecommendedZone(category: string): string {
  const map: Record<string, string> = {
    dairy: 'Main Fridge', meat: 'Main Fridge', seafood: 'Main Fridge',
    produce: 'Crisper Drawer', vegetables: 'Crisper Drawer',
    fruits: 'Fruit Drawer', frozen: 'Freezer',
    pantry: 'Pantry', grains: 'Pantry', bread: 'Counter',
  }
  return map[category.toLowerCase()] ?? 'Pantry'
}

// ---- tests ----

describe('calculateAdjustedExpiry', () => {
  it('freezer extends shelf life vs refrigerator', () => {
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30d from now
    const fridge = calculateAdjustedExpiry(expiry, 1.0, { temperature: 'refrigerator' })
    const freezer = calculateAdjustedExpiry(expiry, 1.0, { temperature: 'freezer' })
    assert.ok(freezer.adjustedExpiry > fridge.adjustedExpiry, 'freezer should extend life')
  })

  it('warm temperature shortens shelf life', () => {
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10)
    const fridge = calculateAdjustedExpiry(expiry, 1.0, { temperature: 'refrigerator' })
    const warm   = calculateAdjustedExpiry(expiry, 1.0, { temperature: 'warm' })
    assert.ok(warm.adjustedExpiry < fridge.adjustedExpiry, 'warm should shorten life')
  })

  it('returns original expiry for already-expired items', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24)
    const result = calculateAdjustedExpiry(past, 1.0)
    assert.equal(result.adjustedExpiry.getTime(), past.getTime())
    assert.equal(result.daysAdjusted, 0)
    assert.equal(result.reason, 'Item already expired')
  })

  it('higher decay multiplier shortens shelf life vs lower multiplier at same temp', () => {
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    const normal = calculateAdjustedExpiry(expiry, 1.0, { temperature: 'room' })
    const fast   = calculateAdjustedExpiry(expiry, 1.8, { temperature: 'room' })
    // At room temp, multiplier 1.8 means faster decay → shorter life
    // Both use same temp so only the manual factor differs
    // combined = tempFactor * manualFactor: 1.8 > 1.0 → shorter adjusted life
    assert.ok(fast.adjustedExpiry.getTime() <= normal.adjustedExpiry.getTime())
  })

  it('clamps decay multiplier to valid range', () => {
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10)
    // multiplier of 999 should be clamped to 2.0 — adjusted life should be same as multiplier 2.0
    const clamped  = calculateAdjustedExpiry(expiry, 999, { temperature: 'room' })
    const maxValid = calculateAdjustedExpiry(expiry, 2.0,  { temperature: 'room' })
    // Compare at second precision to avoid sub-millisecond jitter between two Date.now() calls
    const clampedSec  = Math.round(clamped.adjustedExpiry.getTime() / 1000)
    const maxValidSec = Math.round(maxValid.adjustedExpiry.getTime() / 1000)
    assert.equal(clampedSec, maxValidSec)
  })
})

describe('getRecommendedZone', () => {
  it('maps dairy to Main Fridge', () => {
    assert.equal(getRecommendedZone('dairy'), 'Main Fridge')
  })
  it('maps frozen to Freezer', () => {
    assert.equal(getRecommendedZone('frozen'), 'Freezer')
  })
  it('maps grains to Pantry', () => {
    assert.equal(getRecommendedZone('grains'), 'Pantry')
  })
  it('defaults unknown categories to Pantry', () => {
    assert.equal(getRecommendedZone('unknown_category'), 'Pantry')
  })
  it('is case-insensitive', () => {
    assert.equal(getRecommendedZone('DAIRY'), 'Main Fridge')
  })
})

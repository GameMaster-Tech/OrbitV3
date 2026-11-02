import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createOrbitDemoState, daysUntilDemoExpiry } from '../../lib/demoData.ts'

describe('Orbit demo data', () => {
  it('seeds inventory with expired, urgent, and long-lived household items', () => {
    const items = createOrbitDemoState().inventory
    const expiries = items.map((item) => daysUntilDemoExpiry(item.expiryDate))
    assert.ok(expiries.some((days) => days < 0))
    assert.ok(expiries.some((days) => days >= 0 && days <= 2))
    assert.ok(expiries.some((days) => days > 30))
  })

  it('returns a clean independent state for reset', () => {
    const first = createOrbitDemoState()
    first.inventory[0].quantity = 0
    assert.equal(createOrbitDemoState().inventory[0].quantity, 250)
  })
})

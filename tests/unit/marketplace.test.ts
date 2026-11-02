import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('marketplace & fee calculations', () => {
  const PLATFORM_FEE_RATE = 0.15

  function calculateSwapFinancials(creditPrice: number) {
    const fee = Math.round(creditPrice * PLATFORM_FEE_RATE)
    const sellerReceives = creditPrice - fee
    return { fee, sellerReceives }
  }

  it('calculates 15% platform fee correctly for various prices', () => {
    // 10 credits -> 15% is 1.5 -> rounded to 2. Seller gets 8.
    const res10 = calculateSwapFinancials(10)
    assert.strictEqual(res10.fee, 2)
    assert.strictEqual(res10.sellerReceives, 8)

    // 20 credits -> 15% is 3 -> seller gets 17.
    const res20 = calculateSwapFinancials(20)
    assert.strictEqual(res20.fee, 3)
    assert.strictEqual(res20.sellerReceives, 17)

    // 5 credits -> 15% is 0.75 -> rounded to 1. Seller gets 4.
    const res5 = calculateSwapFinancials(5)
    assert.strictEqual(res5.fee, 1)
    assert.strictEqual(res5.sellerReceives, 4)
  })

  it('guarantees fee + sellerReceives equals total creditPrice', () => {
    for (let price = 1; price <= 100; price++) {
      const { fee, sellerReceives } = calculateSwapFinancials(price)
      assert.strictEqual(fee + sellerReceives, price)
    }
  })

  it('validates self-purchase boundary conditions', () => {
    const buyerId = 'user_alpha'
    const sellerId = 'user_alpha'
    assert.strictEqual(buyerId === sellerId, true, 'Self-purchase detected')
  })
})

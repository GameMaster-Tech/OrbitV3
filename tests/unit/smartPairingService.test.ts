import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mealViabilityScore,
  pairingCompatibilityScore,
  shouldRevealIdentity,
} from '../../lib/smartPairingScores.ts'
import type { PairingMode, SmartPairMatch } from '../../types/index.ts'

describe('shouldRevealIdentity', () => {
  it('returns false when mutual opt-in is false regardless of status', () => {
    assert.strictEqual(shouldRevealIdentity({ status: 'swap_accepted', mutualOptInRevealed: false }), false)
    assert.strictEqual(shouldRevealIdentity({ status: 'cook_accepted', mutualOptInRevealed: false }), false)
  })

  it('returns false for non-terminal statuses even when flag is set', () => {
    const nonTerminal: SmartPairMatch['status'][] = ['candidate', 'notified', 'viewed', 'swap_requested', 'cook_requested']
    for (const status of nonTerminal) {
      assert.strictEqual(shouldRevealIdentity({ status, mutualOptInRevealed: true }), false, `status: ${status}`)
    }
  })

  it('returns true for swap_accepted with mutual opt-in', () => {
    assert.strictEqual(shouldRevealIdentity({ status: 'swap_accepted', mutualOptInRevealed: true }), true)
  })

  it('returns true for cook_accepted with mutual opt-in', () => {
    assert.strictEqual(shouldRevealIdentity({ status: 'cook_accepted', mutualOptInRevealed: true }), true)
  })
})

describe('pairingCompatibilityScore', () => {
  it('returns 0 when either user is private', () => {
    assert.strictEqual(pairingCompatibilityScore('private', 'social'), 0)
    assert.strictEqual(pairingCompatibilityScore('active', 'private'), 0)
  })

  it('social+social is highest non-private score', () => {
    const score = pairingCompatibilityScore('social', 'social')
    assert.strictEqual(score, 96)
  })

  it('passive+passive is lower than active+active', () => {
    assert.ok(pairingCompatibilityScore('passive', 'passive') < pairingCompatibilityScore('active', 'active'))
  })

  it('social+active outscores passive+active', () => {
    assert.ok(pairingCompatibilityScore('social', 'active') > pairingCompatibilityScore('passive', 'active'))
  })

  it('is symmetric — order of users does not change score', () => {
    const pairs: [PairingMode, PairingMode][] = [
      ['passive', 'active'], ['social', 'passive'], ['active', 'social'],
    ]
    for (const [a, b] of pairs) {
      assert.strictEqual(pairingCompatibilityScore(a, b), pairingCompatibilityScore(b, a), `${a}/${b}`)
    }
  })
})

describe('mealViabilityScore', () => {
  it('scores 100 for easy, under 30min, no missing ingredients', () => {
    assert.strictEqual(mealViabilityScore(20, 'easy', []), 100)
  })

  it('reduces score for hard difficulty', () => {
    assert.ok(mealViabilityScore(20, 'hard', []) < mealViabilityScore(20, 'easy', []))
  })

  it('reduces score per missing ingredient', () => {
    const withNone    = mealViabilityScore(20, 'easy', [])
    const withMissing = mealViabilityScore(20, 'easy', ['garlic'])
    assert.ok(withMissing < withNone)
    assert.strictEqual(withNone - withMissing, 14)
  })

  it('clamps to 0 for impossible combos', () => {
    assert.strictEqual(mealViabilityScore(120, 'hard', ['a', 'b', 'c', 'd', 'e', 'f']), 0)
  })

  it('does not exceed 100', () => {
    assert.strictEqual(mealViabilityScore(1, 'easy', []), 100)
  })
})

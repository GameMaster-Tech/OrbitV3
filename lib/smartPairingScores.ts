import type { PairingMode, PantryItem, SmartPairMatch } from '../types'
import { daysUntilExpiry } from './utils.ts'

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function pairingCompatibilityScore(a: PairingMode, b: PairingMode): number {
  if (a === 'private' || b === 'private') return 0
  if (a === 'passive' && b === 'passive') return 72
  if ((a === 'passive' && b === 'active') || (a === 'active' && b === 'passive')) return 80
  if ((a === 'social' && b === 'active') || (a === 'active' && b === 'social')) return 88
  if (a === 'active' && b === 'active') return 90
  if ((a === 'social' && b === 'passive') || (a === 'passive' && b === 'social')) return 82
  if (a === 'social' && b === 'social') return 96
  return 78
}

export function dietCompatibilityScore(restrictions: string[], recipeTags: string[]): number {
  if (!restrictions.length) return 92

  const normalized = restrictions.map((restriction) => restriction.toLowerCase())
  const tags = recipeTags.map((tag) => tag.toLowerCase())

  if (normalized.some((restriction) => restriction.includes('vegan')) && tags.some((tag) => tag.includes('meat') || tag.includes('egg') || tag.includes('dairy'))) {
    return 18
  }

  if (normalized.some((restriction) => restriction.includes('vegetarian')) && tags.some((tag) => tag.includes('meat'))) {
    return 24
  }

  if (normalized.some((restriction) => restriction.includes('gluten')) && tags.some((tag) => tag.includes('pasta') || tag.includes('bread') || tag.includes('noodle'))) {
    return 34
  }

  return 86
}

export function urgencyScore(items: PantryItem[]): number {
  const urgentItems = items
    .map((item) => ({
      days: item.expiryDate ? daysUntilExpiry(item.expiryDate) : 99,
      isExpiringSoon: item.isExpiringSoon,
    }))
    .filter((item) => item.isExpiringSoon)

  if (!urgentItems.length) return 0

  const minDays = Math.min(...urgentItems.map((item) => item.days))
  if (minDays <= 0) return 100
  if (minDays === 1) return 95
  if (minDays === 2) return 84
  if (minDays <= 4) return 72
  return 60
}

export function mealViabilityScore(
  estimatedTimeMinutes: number,
  difficulty: 'easy' | 'medium' | 'hard',
  missingIngredients: string[],
): number {
  const effortPenalty =
    (difficulty === 'hard' ? 20 : difficulty === 'medium' ? 10 : 0) +
    Math.max(0, estimatedTimeMinutes - 30) * 0.8
  const missingPenalty = missingIngredients.length * 14
  return clampScore(100 - effortPenalty - missingPenalty)
}

export function shouldRevealIdentity(match: Pick<SmartPairMatch, 'status' | 'mutualOptInRevealed'>): boolean {
  return match.mutualOptInRevealed && (match.status === 'swap_accepted' || match.status === 'cook_accepted')
}

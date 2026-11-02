import type {
  NearbyPairingUser,
  PairingMode,
  PantryItem,
  SmartPairAction,
  SmartPairFallback,
  SmartPairSuggestion,
} from '@/types'
import { generateMealOpportunity } from './recipeSuggestionService'
import {
  clampScore,
  dietCompatibilityScore,
  mealViabilityScore,
  pairingCompatibilityScore,
  urgencyScore,
} from './smartPairingScores'

export { shouldRevealIdentity } from './smartPairingScores'

const MIN_CONFIDENCE = 80
const MIN_MEAL_VIABILITY = 72
const MIN_EXPIRY_URGENCY = 55
const MAX_SOCIAL_FRICTION = 55

export interface SmartPairingContext {
  currentUserId: string
  currentPairingMode: PairingMode
  currentDietaryRestrictions: string[]
  currentExpiringItems: PantryItem[]
  nearbyUsers: NearbyPairingUser[]
}

export interface ScoredSmartPairSuggestion extends SmartPairSuggestion {
  counterpartUserId: string
  counterpartPairingMode: PairingMode
  recipeId: string
}

export interface SmartPairingResult {
  suggestions: ScoredSmartPairSuggestion[]
  fallback: SmartPairFallback | null
}


function getActions(currentMode: PairingMode, nearbyMode: PairingMode, confidence: number): SmartPairAction[] {
  const actions: SmartPairAction[] = ['unlock_recipe', 'request_swap']

  if (currentMode === 'social' && nearbyMode === 'social' && confidence >= 86) {
    actions.push('cook_together')
  }

  return actions
}

function getNearbyLabel(scope: NearbyPairingUser['locationScope']): string {
  if (scope === 'building') return 'In your building'
  return 'Nearby Orbit user'
}

function buildFallback(items: PantryItem[]): SmartPairFallback {
  const candidates = items
    .filter((item) => item.isExpiringSoon)
    .slice(0, 4)

  const names = candidates.map((item) => item.name)

  const substitutions = names.slice(0, 3).map((name) => `${name}: works well with onion, garlic, or tomatoes`) 
  const soloSuggestions = names.length
    ? names.map((name) => `Quick saute ${name} with pantry spices and serve over rice or toast.`)
    : [
      'Build a quick stir-fry with any vegetables and rice/noodles you already have.',
      'Use staples like eggs, lentils, or pasta for a 20-minute solo dinner.',
    ]

  return {
    title: 'No Nearby Match Yet',
    body: 'But you can still use your expiring ingredients tonight.',
    substitutions,
    soloSuggestions,
  }
}

export async function matchExpiringIngredients(context: SmartPairingContext): Promise<SmartPairingResult> {
  if (context.currentPairingMode === 'private') {
    return {
      suggestions: [],
      fallback: buildFallback(context.currentExpiringItems),
    }
  }

  const suggestions: ScoredSmartPairSuggestion[] = []

  for (const nearby of context.nearbyUsers) {
    if (nearby.pairingMode === 'private') continue

    const opportunity = await generateMealOpportunity({
      userAItems: context.currentExpiringItems,
      userBItems: nearby.pantryItems.filter((item) => item.isExpiringSoon && item.shareable),
    })

    if (!opportunity) continue

    const pairingCompatibility = pairingCompatibilityScore(context.currentPairingMode, nearby.pairingMode)
    if (pairingCompatibility <= 0) continue

    const dietCompatibility = dietCompatibilityScore(
      [...context.currentDietaryRestrictions, ...nearby.dietaryRestrictions],
      opportunity.tags,
    )
    if (dietCompatibility < 30) continue

    const expiryUrgency = urgencyScore([
      ...context.currentExpiringItems.filter((item) => opportunity.usedFromA.includes(item.normalizedName) || opportunity.usedFromA.includes(item.name.toLowerCase())),
      ...nearby.pantryItems.filter((item) => opportunity.usedFromB.includes(item.normalizedName) || opportunity.usedFromB.includes(item.name.toLowerCase())),
    ])

    const viability = mealViabilityScore(opportunity.estimatedTimeMinutes, opportunity.difficulty, opportunity.missingIngredients)
    const socialFriction = clampScore((100 - pairingCompatibility) + (opportunity.missingIngredients.length * 10))

    const confidenceScore = clampScore(
      opportunity.confidenceScore * 0.38 +
      viability * 0.24 +
      expiryUrgency * 0.18 +
      dietCompatibility * 0.12 +
      (100 - socialFriction) * 0.08,
    )

    if (confidenceScore < MIN_CONFIDENCE) continue
    if (viability < MIN_MEAL_VIABILITY) continue
    if (expiryUrgency < MIN_EXPIRY_URGENCY) continue
    if (socialFriction > MAX_SOCIAL_FRICTION) continue

    suggestions.push({
      counterpartUserId: nearby.uid,
      counterpartPairingMode: nearby.pairingMode,
      recipeId: opportunity.recipeId,
      recipeName: opportunity.recipeName,
      confidenceScore,
      missingIngredients: opportunity.missingIngredients,
      yourIngredients: opportunity.usedFromA,
      nearbyComplementaryIngredients: opportunity.usedFromB,
      nearbyLabel: getNearbyLabel(nearby.locationScope),
      actions: getActions(context.currentPairingMode, nearby.pairingMode, confidenceScore),
      estimatedTimeMinutes: opportunity.estimatedTimeMinutes,
      difficulty: opportunity.difficulty,
      mealViabilityScore: viability,
      expiryUrgencyScore: expiryUrgency,
      socialFrictionScore: socialFriction,
    })
  }

  suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore)

  return {
    suggestions,
    fallback: suggestions.length === 0 ? buildFallback(context.currentExpiringItems) : null,
  }
}


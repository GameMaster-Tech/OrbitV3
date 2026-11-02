import { NextRequest, NextResponse } from 'next/server'
import { loadSmartPairingNetwork, upsertSmartPairMatch } from '@/lib/database'
import { matchExpiringIngredients } from '@/lib/smartPairingService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid = typeof body?.uid === 'string' ? body.uid : ''
    const expandRadius = Boolean(body?.expandRadius)

    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 })
    }

    const network = await loadSmartPairingNetwork(uid, { expandRadius })
    if (!network) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const result = await matchExpiringIngredients({
      currentUserId: uid,
      currentPairingMode: network.currentProfile.pairingMode ?? 'passive',
      currentDietaryRestrictions: network.currentDietaryRestrictions,
      currentExpiringItems: network.currentExpiringItems,
      nearbyUsers: network.nearbyUsers,
    })

    const persisted = await Promise.all(
      result.suggestions.map(async (suggestion) => {
        const matchId = await upsertSmartPairMatch({
          userAId: uid,
          userBId: suggestion.counterpartUserId,
          recipeName: suggestion.recipeName,
          recipeId: suggestion.recipeId,
          confidenceScore: suggestion.confidenceScore,
          expiryUrgencyScore: suggestion.expiryUrgencyScore,
          mealViabilityScore: suggestion.mealViabilityScore,
          socialFrictionScore: suggestion.socialFrictionScore,
          missingIngredients: suggestion.missingIngredients,
          ingredientsForA: suggestion.yourIngredients,
          nearbyIngredientsForA: suggestion.nearbyComplementaryIngredients,
          ingredientsForB: suggestion.nearbyComplementaryIngredients,
          nearbyIngredientsForB: suggestion.yourIngredients,
          actionsForA: suggestion.actions,
          actionsForB: suggestion.actions,
          nearbyLabelForA: suggestion.nearbyLabel,
          nearbyLabelForB: suggestion.nearbyLabel,
          estimatedTimeMinutes: suggestion.estimatedTimeMinutes,
          difficulty: suggestion.difficulty,
        })

        return {
          id: matchId,
          ...suggestion,
        }
      })
    )

    return NextResponse.json({
      suggestions: persisted,
      fallback: result.fallback,
      scannedNearbyUsers: network.nearbyUsers.length,
    })
  } catch (error) {
    console.error('[smart-pairing/discover]', error)
    return NextResponse.json({ error: 'Failed to discover smart pair matches' }, { status: 500 })
  }
}


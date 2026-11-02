import { NextRequest, NextResponse } from 'next/server'
import { generateStructuredJSON, geminiFlash } from '@/lib/gemini'
import { daysUntilExpiry } from '@/lib/utils'
import type { GetFlavoredPreferences, GetFlavoredResponse, InventoryItem } from '@/types'

function normalizePreferences(payload: unknown): GetFlavoredPreferences {
  const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const cuisineStyle = typeof obj.cuisineStyle === 'string' ? obj.cuisineStyle : 'global comfort'
  const flavorMood = typeof obj.flavorMood === 'string' ? obj.flavorMood : 'savory and fun'
  const maxCookTimeRaw = typeof obj.maxCookTime === 'number' ? obj.maxCookTime : 25
  const maxCookTime = Math.max(10, Math.min(60, Math.round(maxCookTimeRaw)))

  return { cuisineStyle, flavorMood, maxCookTime }
}

function buildFallbackRecipes(
  upcomingExpiring: InventoryItem[],
  preferences: GetFlavoredPreferences,
): GetFlavoredResponse {
  const picks = upcomingExpiring.slice(0, 3)
  const recipes = picks.map((item, index) => {
    const itemName = item.productName?.trim() || 'Pantry item'
    const cookTimeMinutes = Math.min(preferences.maxCookTime, 15 + index * 5)

    return {
      title: `${itemName} ${preferences.cuisineStyle} Quick Toss`,
      description: `A ${preferences.flavorMood.toLowerCase()} recipe designed to use ${itemName} before it expires.`,
      cookTimeMinutes,
      servings: 2,
      difficulty: 'easy' as const,
      ingredients: [
        `${item.quantity} ${item.unit ?? 'units'} ${itemName}`,
        '1 tbsp oil or butter',
        '1 clove garlic (optional)',
        'Salt and pepper to taste',
        'Any quick add-ins you have (onion, tomato, herbs, chili flakes)',
      ],
      steps: [
        `Prep ${itemName} into bite-sized pieces.`,
        'Heat oil in a pan and saute aromatics for 30-60 seconds.',
        `Add ${itemName}, season, and cook until tender.`,
        'Add any quick add-ins, toss for 2-3 minutes, and taste-adjust.',
        'Serve immediately as a snack, side, or over rice/noodles.',
      ],
      funTip: 'Finish with lemon juice or chili oil for instant flavor lift.',
      expiringItemsUsed: [itemName],
    }
  })

  return {
    summary: 'Quick rescue recipes were generated with fallback mode so you can keep cooking without interruption.',
    recipes,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const inventory = Array.isArray(body?.inventory) ? (body.inventory as InventoryItem[]) : []
    const preferences = normalizePreferences(body?.preferences)

    const upcomingExpiring = inventory
      .filter((item) => item.tab === 'kitchen')
      .filter((item) => {
        const expiry = item.adjustedExpiryDate ?? item.expiryDate
        if (!expiry) return false
        const days = daysUntilExpiry(expiry)
        return days >= 0 && days <= 5
      })
      .slice(0, 15)

    if (upcomingExpiring.length === 0) {
      return NextResponse.json({
        recipes: [],
        summary: 'No upcoming expiring kitchen items found in the next 5 days.',
      })
    }

    const itemContext = upcomingExpiring
      .map((item) => {
        const expiry = item.adjustedExpiryDate ?? item.expiryDate
        const days = expiry ? daysUntilExpiry(expiry) : null
        return `${item.productName} (${item.quantity} ${item.unit ?? 'units'}, ${days ?? '?'}d left)`
      })
      .join(', ')

    const prompt = `You are ORBIT Get Flavored, a playful and practical zero-waste chef.

Create 3 quick and fun recipes using upcoming expiring items.

Upcoming expiring items: ${itemContext}

User preferences:
- Cuisine style: ${preferences.cuisineStyle}
- Flavor mood: ${preferences.flavorMood}
- Max cook time: ${preferences.maxCookTime} minutes

Rules:
- Every recipe must use at least one expiring item.
- Keep steps short and beginner friendly.
- Keep cook time <= ${preferences.maxCookTime} minutes.
- Include specific ingredients and clear measurements where possible.
- Make the recipes exciting but realistic.

Return strict JSON:
{
  "summary": "short 1-2 sentence overview",
  "recipes": [
    {
      "title": "string",
      "description": "string",
      "cookTimeMinutes": number,
      "servings": number,
      "difficulty": "easy" | "medium" | "hard",
      "ingredients": ["string"],
      "steps": ["string"],
      "funTip": "string",
      "expiringItemsUsed": ["string"]
    }
  ]
}`

    let result: GetFlavoredResponse
    try {
      result = await generateStructuredJSON<GetFlavoredResponse>(geminiFlash, prompt)
    } catch (error) {
      console.warn('[get-flavored] Falling back to deterministic recipes due to AI error:', error)
      result = buildFallbackRecipes(upcomingExpiring, preferences)
    }

    const recipes = Array.isArray(result.recipes) ? result.recipes.slice(0, 4) : []
    return NextResponse.json({
      summary: result.summary || 'Fresh ideas generated for your kitchen.',
      recipes,
    })
  } catch (error) {
    console.error('[get-flavored]', error)
    return NextResponse.json({ error: 'Get Flavored generation failed' }, { status: 500 })
  }
}

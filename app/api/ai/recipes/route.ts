import { NextRequest, NextResponse } from 'next/server'
import { generateStructuredJSON, geminiFlash } from '@/lib/gemini'
import type { InventoryItem, RecipeResponse } from '@/types'
import { daysUntilExpiry } from '@/lib/utils'

function buildFallbackRecipes(expiringItems: InventoryItem[]): RecipeResponse {
  const used = expiringItems.slice(0, 3)
  const recipes = used.map((item, idx) => {
    const name = item.productName || 'Pantry Essential'
    return {
      name: `Quick ${name} Skillet Sauté`,
      description: `A fast zero-waste meal utilizing ${name} before expiry.`,
      cookTime: `${15 + idx * 5} minutes`,
      ingredients: [
        `${item.quantity} ${item.unit ?? 'units'} ${name}`,
        '1 tbsp olive oil or butter',
        'Salt, pepper, and garlic powder to taste',
        'Staple grain or bread for serving',
      ],
      steps: [
        `Wash and prep ${name} into uniform bite-sized pieces.`,
        'Heat oil in a skillet over medium heat and add seasonings.',
        `Sauté ${name} until tender and lightly caramelized.`,
        'Serve warm alongside rice, toast, or salad.',
      ],
      servings: 2,
    }
  })

  return {
    recipes,
    expiringItemsUsed: used.map((i) => i.productName),
  }
}

export async function POST(req: NextRequest) {
  let expiringItems: InventoryItem[] = []

  try {
    const body = await req.json()
    const inventory = Array.isArray(body?.inventory) ? (body.inventory as InventoryItem[]) : []

    expiringItems = inventory.filter((i) => {
      const expiry = i.adjustedExpiryDate ?? i.expiryDate
      if (!expiry) return false
      const days = daysUntilExpiry(expiry)
      return days >= 0 && days <= 3
    })

    if (expiringItems.length === 0) {
      return NextResponse.json({
        recipes: [],
        expiringItemsUsed: [],
        message: 'No expiring items to cook with!',
        source: 'fallback',
      })
    }

    const itemNames = expiringItems.map(i => `${i.productName} (${i.quantity} ${i.unit ?? 'units'})`).join(', ')

    try {
      const data = await generateStructuredJSON<RecipeResponse>(geminiFlash, `
You are a Zero-Waste Chef AI. Generate 3 recipes using ONLY the provided expiring ingredients.
Expiring items: ${itemNames}

Return this exact JSON structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "One sentence description",
      "cookTime": "20 minutes",
      "ingredients": ["item 1", "item 2"],
      "steps": ["Step 1 instruction", "Step 2 instruction", "Step 3 instruction"],
      "servings": 2
    }
  ],
  "expiringItemsUsed": ["item1", "item2"]
}

Rules:
- Use as many expiring items as possible per recipe
- Keep it practical and achievable
- Each recipe must use at least 1 expiring item
- Steps should be concise (1 sentence each, 3-5 steps per recipe)
`)
      if (Array.isArray(data?.recipes) && data.recipes.length > 0) {
        return NextResponse.json({ ...data, source: 'live' })
      }
    } catch (geminiErr) {
      console.warn('[recipes] Gemini generation failed, falling back to heuristic recipes:', geminiErr)
    }

    return NextResponse.json({ ...buildFallbackRecipes(expiringItems), source: 'fallback' })
  } catch (err) {
    console.error('[recipes]', err)
    if (expiringItems.length > 0) {
      return NextResponse.json({ ...buildFallbackRecipes(expiringItems), source: 'fallback' })
    }
    return NextResponse.json({ recipes: [], expiringItemsUsed: [], message: 'No recipes available', source: 'fallback' })
  }
}

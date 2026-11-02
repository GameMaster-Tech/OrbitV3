import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/groq'

const DEFAULT_SHELF_LIFE_DAYS: Record<string, number> = {
  dairy: 5,
  meat: 3,
  seafood: 2,
  produce: 6,
  vegetables: 6,
  fruits: 5,
  frozen: 90,
  pantry: 60,
  grains: 180,
  snacks: 45,
  bread: 4,
  beverages: 14,
  other: 14,
}

function getFallbackPrediction(category?: string, purchaseDate?: string): {
  predictedExpiryDate: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
} {
  const cat = (category ?? 'other').toLowerCase()
  const days = DEFAULT_SHELF_LIFE_DAYS[cat] ?? 14
  const base = purchaseDate ? new Date(purchaseDate) : new Date()
  const validBase = isNaN(base.getTime()) ? new Date() : base
  const predicted = new Date(validBase.getTime() + days * 24 * 60 * 60 * 1000)
  const iso = predicted.toISOString().slice(0, 10)

  return {
    predictedExpiryDate: iso,
    confidence: 'low',
    reasoning: `Estimated standard Indian domestic shelf-life for ${cat} (~${days} days).`,
  }
}

export async function POST(req: NextRequest) {
  let categoryStr = 'other'
  let purchaseDateStr: string | undefined

  try {
    const body = await req.json()
    const { productName, category, quantity, unit, purchaseDate, originalExpiryDate, zoneConditions } = body ?? {}

    if (!productName || typeof productName !== 'string' || !productName.trim()) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    }

    categoryStr = typeof category === 'string' ? category : 'other'
    purchaseDateStr = typeof purchaseDate === 'string' ? purchaseDate : undefined

    const prompt = `You are a food science and household goods expert. Predict the realistic expiry date for this item based on real-world conditions.

ITEM DETAILS:
- Product: ${productName.trim().slice(0, 100)}
- Category: ${categoryStr}
- Quantity: ${quantity ?? 1} ${unit ?? 'units'}
- Purchase date: ${purchaseDateStr ?? 'unknown'}
- Labelled expiry date: ${originalExpiryDate ?? 'not provided'}
- Storage conditions: ${zoneConditions ?? 'standard room temperature'}

TASK: Based on the product type, typical storage conditions in an Indian household, and any provided details, give a realistic predicted expiry date.

Consider:
- How this product is typically stored in Indian homes
- Whether the labelled date is conservative or accurate
- Common factors that accelerate or slow spoilage (humidity, temperature, packaging)
- If no expiry date is given, estimate based on product type and purchase date

Respond with ONLY a JSON object in this exact format, no other text:
{
  "predictedExpiryDate": "YYYY-MM-DD",
  "confidence": "high" | "medium" | "low",
  "reasoning": "One sentence explaining the prediction"
}`

    try {
      const raw = await groqChat(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 200, timeoutMs: 12000 }
      )

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const dateValid = parsed.predictedExpiryDate && !isNaN(new Date(parsed.predictedExpiryDate).getTime())
        if (dateValid) {
          const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium'
          return NextResponse.json({
            predictedExpiryDate: parsed.predictedExpiryDate,
            confidence,
            reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'AI modeled estimate based on storage conditions.',
          })
        }
      }
    } catch (aiErr) {
      console.warn('[predict-expiry] AI inference failed, falling back to heuristic:', aiErr)
    }

    // Graceful deterministic fallback
    const fallback = getFallbackPrediction(categoryStr, purchaseDateStr)
    return NextResponse.json(fallback)
  } catch (err) {
    console.error('[predict-expiry]', err)
    const fallback = getFallbackPrediction(categoryStr, purchaseDateStr)
    return NextResponse.json(fallback)
  }
}

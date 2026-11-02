import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/groq'
import { parseModelJson } from '@/lib/gemini'

interface HealthCheckRequest {
  item: { productName: string; category: string }
  allergies: string[]
  conditions: string[]
  dietaryRestrictions: string[]
  medications: { name: string; dosage: string }[]
}

export interface HealthCheckResult {
  hasConflict: boolean
  conflictType: 'allergy' | 'condition' | 'dietary' | 'medication' | null
  severity: 'critical' | 'high' | 'medium' | null
  reason: string
  alternatives: string[]
}

function normalizePayload(payload: unknown): HealthCheckRequest {
  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const item = body.item && typeof body.item === 'object' ? (body.item as Record<string, unknown>) : {}

  return {
    item: {
      productName: typeof item.productName === 'string' ? item.productName : '',
      category: typeof item.category === 'string' ? item.category : 'other',
    },
    allergies: Array.isArray(body.allergies) ? body.allergies.filter((value): value is string => typeof value === 'string') : [],
    conditions: Array.isArray(body.conditions) ? body.conditions.filter((value): value is string => typeof value === 'string') : [],
    dietaryRestrictions: Array.isArray(body.dietaryRestrictions)
      ? body.dietaryRestrictions.filter((value): value is string => typeof value === 'string')
      : [],
    medications: Array.isArray(body.medications)
      ? body.medications
          .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
          .map((medication) => ({
            name: typeof medication.name === 'string' ? medication.name : '',
            dosage: typeof medication.dosage === 'string' ? medication.dosage : '',
          }))
      : [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = normalizePayload(await req.json())
    const { item, allergies, conditions, dietaryRestrictions, medications } = body

    if (!item.productName.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    if (!allergies.length && !conditions.length && !dietaryRestrictions.length && !medications.length) {
      return NextResponse.json({ hasConflict: false, conflictType: null, severity: null, reason: '', alternatives: [] })
    }

    const prompt = `You are a health-aware household AI. Check if this grocery/household item conflicts with the user's health profile.

Item being added: "${item.productName}" (category: ${item.category})

User health profile:
- Allergies: ${allergies.join(', ') || 'none'}
- Medical conditions: ${conditions.join(', ') || 'none'}
- Dietary restrictions: ${dietaryRestrictions.join(', ') || 'none'}
- Current medications: ${medications.map((medication) => `${medication.name} ${medication.dosage}`).join(', ') || 'none'}

Analyze if this item:
1. Contains or may contain allergens the user is allergic to
2. Is contraindicated with their medical conditions
3. Violates their dietary restrictions
4. Has known interactions with their medications

If there IS a conflict, suggest 2-3 specific healthier alternatives that avoid the conflict.
If there is NO conflict, return hasConflict: false.

Respond with ONLY this JSON:
{
  "hasConflict": boolean,
  "conflictType": "allergy" | "condition" | "dietary" | "medication" | null,
  "severity": "critical" | "high" | "medium" | null,
  "reason": "one clear sentence explaining the conflict, or empty string",
  "alternatives": ["alternative 1", "alternative 2"]
}`

    const raw = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 300 })
    const result: HealthCheckResult = parseModelJson<HealthCheckResult>(raw)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[health-check]', error)
    return NextResponse.json({ hasConflict: false, conflictType: null, severity: null, reason: '', alternatives: [] })
  }
}


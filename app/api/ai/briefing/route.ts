import { NextRequest, NextResponse } from 'next/server'
import { geminiFlash } from '@/lib/gemini'
import type { InventoryItem, SmartCardData, Expense } from '@/types'
import { daysUntilExpiry } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { inventory = [], smartCards = [], expenses = [] }: {
      inventory: InventoryItem[]
      smartCards: SmartCardData[]
      expenses: Expense[]
    } = body

    const expiringItems = inventory.filter((i) => {
      const expiry = i.adjustedExpiryDate ?? i.expiryDate
      if (!expiry) return false
      const days = daysUntilExpiry(expiry)
      return days >= 0 && days <= 3
    })

    const expiredItems = inventory.filter((i) => {
      const expiry = i.adjustedExpiryDate ?? i.expiryDate
      if (!expiry) return false
      return daysUntilExpiry(expiry) < 0
    })

    const criticalCards = smartCards.filter((c) => c.priority === 'critical')
    const totalExpenses = expenses.slice(0, 30).reduce((sum, e) => sum + e.amount, 0)
    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

    if (!geminiFlash) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const prompt = `You are ORBIT, a witty, terse AI domestic steward. Generate a single-paragraph daily briefing (MAX 60 words) for the user.

Current data:
- Time: ${timeOfDay}
- Expiring items (<=3 days): ${expiringItems.map((i) => i.productName).join(', ') || 'none'}
- Expired items: ${expiredItems.map((i) => i.productName).join(', ') || 'none'}
- Critical alerts: ${criticalCards.length}
- Total items in inventory: ${inventory.length}
- Spending last 30 days: $${totalExpenses.toFixed(0)}

Rules:
- Be witty, direct, cyberpunk tone like a sarcastic AI assistant
- No bullet points. Single paragraph only.
- If nothing urgent: give a calm, slightly smug status update
- If items expiring: mention them with urgency and suggest action
- MAX 60 words
- End with a short actionable suggestion`

    const result = await geminiFlash.generateContent(prompt)
    const briefing = result.response.text().trim()

    return NextResponse.json({ briefing, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[briefing]', err)
    return NextResponse.json(
      {
        briefing: 'Neural link degraded. Life telemetry unavailable. Check your systems.',
        generatedAt: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateStructuredJSON, geminiPro } from '@/lib/gemini'
import type { OracleResponse, InventoryItem, Expense } from '@/types'
import { daysUntilExpiry } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { inventory = [], expenses = [], health = null } = await req.json()

    const expiringItems = (inventory as InventoryItem[]).filter(i => {
      const expiry = i.adjustedExpiryDate ?? i.expiryDate
      return expiry && daysUntilExpiry(expiry) <= 7 && daysUntilExpiry(expiry) >= 0
    })

    const totalSpent = (expenses as Expense[]).slice(0, 30).reduce((sum, e) => sum + e.amount, 0)
    const categories = Array.from(new Set((expenses as Expense[]).map(e => e.category)))

    const data = await generateStructuredJSON<OracleResponse>(geminiPro, `
You are ORBIT's Oracle — a predictive intelligence engine. Analyze the user's life data and generate 3-5 proactive insights.

User data:
- Total inventory items: ${(inventory as InventoryItem[]).length}
- Items expiring soon (≤7 days): ${expiringItems.map(i => i.productName).join(', ') || 'none'}
- Recent spending: $${totalSpent.toFixed(0)} across categories: ${categories.join(', ')}
- Health allergies: ${health?.allergies?.join(', ') || 'none recorded'}

Generate insights that are:
1. Predictive (anticipate future issues, not just current ones)
2. Actionable (tell them exactly what to do)
3. Varied (cover different life areas: food, health, budget, efficiency)
4. Witty but concise

Return JSON:
{
  "insights": [
    {
      "title": "Short catchy title",
      "description": "1-2 sentence insight with specific prediction",
      "priority": "low"|"medium"|"high"|"critical",
      "actionable": true|false,
      "action": "Specific action to take (optional)"
    }
  ]
}`)

    return NextResponse.json(data)
  } catch (err) {
    console.error('[oracle]', err)
    return NextResponse.json({ insights: [] }, { status: 200 })
  }
}

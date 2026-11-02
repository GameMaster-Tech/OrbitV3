import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/groq'
import type { InventoryItem } from '@/types'
import { daysUntilExpiry } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { scenario, inventory = [], wallet = null } = await req.json()

    if (!scenario?.trim()) {
      return NextResponse.json({ error: 'Scenario is required' }, { status: 400 })
    }

    const items = inventory as InventoryItem[]

    const expiringItems = items.filter(i => {
      const exp = i.adjustedExpiryDate ?? i.expiryDate
      return exp && daysUntilExpiry(exp) <= 7 && daysUntilExpiry(exp) >= 0
    })

    const inventorySummary = items
      .slice(0, 30)
      .map(i => {
        const exp = i.adjustedExpiryDate ?? i.expiryDate
        const days = exp ? daysUntilExpiry(exp) : null
        return `- ${i.productName}: ${i.quantity} ${i.unit ?? 'units'}${i.price ? ` (₹${i.price} each)` : ''}${days !== null ? `, expires in ${days}d` : ''}`
      })
      .join('\n')

    const prompt = `You are Orbit, a smart household AI. A user wants to simulate a scenario for their home.

SCENARIO: "${scenario}"

HOUSEHOLD INVENTORY (${items.length} items):
${inventorySummary || 'No items tracked yet.'}

Items expiring within 7 days: ${expiringItems.map(i => i.productName).join(', ') || 'none'}
Orbit credits available: ${wallet?.balance ?? 0}

Respond in a clear, helpful, conversational tone. Structure your response with these sections using plain text (no markdown symbols like ** or ##):

WHAT WILL HAPPEN
2-3 sentences describing the realistic impact on their household.

WHAT YOU NEED TO BUY
A numbered list of specific items with quantities and estimated costs in ₹. Be realistic about Indian market prices.

USING EXPIRING ITEMS
If any items are expiring soon, suggest how to use them in this scenario. Skip this section if nothing is expiring.

ACTION PLAN
3-5 numbered steps to prepare for this scenario right now.

ESTIMATED BUDGET
A single line with the rough total cost in ₹.

Be specific, practical, and use the actual inventory data. Keep the total response under 350 words.`

    const reply = await groqChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.65, maxTokens: 900 }
    )

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[orbit-sim]', err)
    return NextResponse.json({ error: 'Simulation failed. Please try again.' }, { status: 500 })
  }
}

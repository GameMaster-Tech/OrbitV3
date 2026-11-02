import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/groq'
import type { GroqMessage } from '@/lib/groq'
import type { InventoryItem, Expense, Budget, HealthProfile } from '@/types'
import { daysUntilExpiry } from '@/lib/utils'

type AssistantContext = {
  inventory?: InventoryItem[]
  expenses?: Expense[]
  budgets?: Budget[]
  health?: HealthProfile | null
  wallet?: { balance?: number } | null
}

function normalizeHistory(payload: unknown): GroqMessage[] {
  if (!Array.isArray(payload)) return []

  return payload
    .filter((entry): entry is { role: 'system' | 'user' | 'assistant'; content: string } => {
      if (!entry || typeof entry !== 'object') return false
      const role = (entry as { role?: unknown }).role
      const content = (entry as { content?: unknown }).content
      const validRole = role === 'system' || role === 'user' || role === 'assistant'
      return validRole && typeof content === 'string'
    })
    .map((entry) => ({ role: entry.role, content: entry.content }))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body?.message === 'string' ? body.message : ''
    const history = normalizeHistory(body?.history)
    const context: AssistantContext = body?.context && typeof body.context === 'object' ? body.context : {}

    const inventory = Array.isArray(context.inventory) ? context.inventory : []
    const expenses = Array.isArray(context.expenses) ? context.expenses : []
    const budgets = Array.isArray(context.budgets) ? context.budgets : []
    const health = context.health ?? null
    const wallet = context.wallet ?? null

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const expiringItems = inventory.filter((item) => {
      const expiry = item.adjustedExpiryDate ?? item.expiryDate
      return expiry && daysUntilExpiry(expiry) >= 0 && daysUntilExpiry(expiry) <= 5
    })

    const expiredItems = inventory.filter((item) => {
      const expiry = item.adjustedExpiryDate ?? item.expiryDate
      return expiry && daysUntilExpiry(expiry) < 0
    })

    const monthlySpend = expenses
      .filter((expense) => {
        const date = new Date(expense.date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    const systemPrompt = `You are Orbit Assistant, a warm and knowledgeable household AI. You have access to the user's household data and should answer clearly and helpfully.

## Current Household Snapshot
- Total inventory: ${inventory.length} items
- Expiring soon (<=5 days): ${expiringItems.map((item) => `${item.productName} (${daysUntilExpiry(item.adjustedExpiryDate ?? item.expiryDate!)}d)`).join(', ') || 'none'}
- Expired items: ${expiredItems.map((item) => item.productName).join(', ') || 'none'}
- Monthly spend: $${monthlySpend.toFixed(2)}
- Active budgets: ${budgets.length}
- Credits balance: ${wallet?.balance ?? 0}
${health ? `- Allergies: ${health.allergies?.join(', ') || 'none'}
- Medications: ${health.medications?.length ?? 0} active` : ''}

## Full Inventory
${inventory
  .slice(0, 40)
  .map((item) => {
    const expiry = item.adjustedExpiryDate ?? item.expiryDate
    const days = expiry ? daysUntilExpiry(expiry) : null
    return `- ${item.productName} (${item.category}, qty: ${item.quantity}${days !== null ? `, expires: ${days < 0 ? 'EXPIRED' : `${days}d`}` : ''})`
  })
  .join('\n') || 'No items'}

## Recent Expenses
${expenses.slice(0, 10).map((expense) => `- ${expense.description}: $${expense.amount} (${expense.category})`).join('\n') || 'No expenses'}

## Instructions
- Answer questions about the household data above
- Be concise but thorough, use bullet points for lists
- If asked for recommendations, be specific and actionable
- If data is missing, say so honestly
- Keep responses under 300 words unless the question requires more detail
- Use a friendly and confident tone`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: message },
    ]

    const reply = await groqChat(messages, { temperature: 0.65, maxTokens: 800 })

    return NextResponse.json({ reply, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[assistant]', error)
    return NextResponse.json({ error: 'Assistant unavailable' }, { status: 500 })
  }
}
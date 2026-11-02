import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseModelJson } from '../../lib/gemini.ts'

describe('AI Schema Parsing & Fallback Resilience', () => {
  it('parses raw clean JSON', () => {
    const raw = '{"productName": "Milk 2%", "confidence": 0.95}'
    const parsed = parseModelJson<{ productName: string; confidence: number }>(raw)
    assert.strictEqual(parsed.productName, 'Milk 2%')
    assert.strictEqual(parsed.confidence, 0.95)
  })

  it('parses JSON wrapped in markdown code blocks', () => {
    const raw = `\`\`\`json
{
  "productName": "Brown Bread",
  "category": "bread",
  "expiryDate": "2026-11-05"
}
\`\`\``
    const parsed = parseModelJson<{ productName: string; category: string }>(raw)
    assert.strictEqual(parsed.productName, 'Brown Bread')
    assert.strictEqual(parsed.category, 'bread')
  })

  it('parses JSON surrounded by conversational AI commentary', () => {
    const raw = `Sure! Here is the JSON analysis you requested:
\`\`\`json
{
  "hasConflict": true,
  "conflictType": "allergy",
  "severity": "critical",
  "reason": "Contains peanuts",
  "alternatives": ["Sunflower seed butter"]
}
\`\`\`
I hope this helps your household!`

    const parsed = parseModelJson<{ hasConflict: boolean; severity: string }>(raw)
    assert.strictEqual(parsed.hasConflict, true)
    assert.strictEqual(parsed.severity, 'critical')
  })

  it('handles JSON array outputs', () => {
    const raw = `[{"title": "Recipe 1"}, {"title": "Recipe 2"}]`
    const parsed = parseModelJson<Array<{ title: string }>>(raw)
    assert.strictEqual(parsed.length, 2)
    assert.strictEqual(parsed[0].title, 'Recipe 1')
  })
})

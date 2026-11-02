// Groq — fast inference for non-critical tasks (assistant chat, quick summaries)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqChatOptions {
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  retries?: number
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqChatOptions = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured. Set it in .env.local.')

  const maxRetries = options.retries ?? 1
  const timeoutMs = options.timeoutMs ?? 20000

  let attempt = 0
  let lastError: Error | null = null

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens:  options.maxTokens  ?? 1024,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        if (res.status === 429 && attempt < maxRetries) {
          attempt++
          await new Promise((r) => setTimeout(r, 1000 * attempt))
          continue
        }
        throw new Error(`Groq API error ${res.status}: ${errText}`)
      }

      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        attempt++
        await new Promise((r) => setTimeout(r, 1000 * attempt))
        continue
      }
      break
    }
  }

  throw lastError ?? new Error('Groq request failed')
}

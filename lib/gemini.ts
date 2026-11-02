import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

type InlinePart = {
  inlineData: {
    data: string
    mimeType: string
  }
}

type GeminiPart = string | InlinePart

const apiKey = process.env.GEMINI_API_KEY
const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL ?? 'gemini-3.5-flash'
const PRO_MODEL = process.env.GEMINI_PRO_MODEL ?? 'gemini-3.5-flash'
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

function createModel(
  model: string,
  generationConfig: { temperature: number; topP: number },
): GenerativeModel | null {
  if (!genAI) return null
  return genAI.getGenerativeModel({ model, generationConfig })
}

function assertModel(model: GenerativeModel | null): GenerativeModel {
  if (!model) {
    throw new Error('GEMINI_API_KEY is not configured. Set it in .env.local for AI routes.')
  }
  return model
}

export function parseModelJson<T>(rawText: string): T {
  let cleaned = rawText.trim()
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch?.[1]) {
    cleaned = codeBlockMatch[1].trim()
  } else {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (jsonMatch?.[0]) {
      cleaned = jsonMatch[0].trim()
    }
  }

  return JSON.parse(cleaned) as T
}

export const geminiFlash = createModel(FLASH_MODEL, {
  temperature: 0.7,
  topP: 0.9,
})

export const geminiPro = createModel(PRO_MODEL, {
  temperature: 0.5,
  topP: 0.9,
})

export async function generateStructuredJSON<T>(
  model: GenerativeModel | null,
  prompt: string,
): Promise<T> {
  const activeModel = assertModel(model)
  const result = await activeModel.generateContent(
    `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.`
  )
  return parseModelJson<T>(result.response.text())
}

export async function generateStructuredJSONFromParts<T>(
  model: GenerativeModel | null,
  parts: GeminiPart[],
  prompt: string,
): Promise<T> {
  const activeModel = assertModel(model)
  const result = await activeModel.generateContent([
    ...parts,
    `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.`,
  ])

  return parseModelJson<T>(result.response.text())
}

export function buildImagePart(base64: string, mimeType: string): InlinePart {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  }
}

export function buildAudioPart(base64: string, mimeType: string): InlinePart {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  }
}

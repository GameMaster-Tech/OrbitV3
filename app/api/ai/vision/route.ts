import { NextRequest, NextResponse } from 'next/server'
import { geminiFlash, buildImagePart, generateStructuredJSON, generateStructuredJSONFromParts } from '@/lib/gemini'
import type { VisionProductResponse, VisionPrescriptionResponse } from '@/types'

type VisionAnnotation = {
  fullTextAnnotation?: { text?: string }
  textAnnotations?: Array<{ description?: string }>
  labelAnnotations?: Array<{ description?: string; score?: number }>
  localizedObjectAnnotations?: Array<{ name?: string; score?: number }>
}

const CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY
const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

type ProductVisionResult = VisionProductResponse & {
  barcode?: string | null
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateToken(token: string): string | null {
  const cleaned = token.trim().replace(/[.,]/g, '')

  const yyyyFirst = cleaned.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
  if (yyyyFirst) {
    return toIsoDate(Number(yyyyFirst[1]), Number(yyyyFirst[2]), Number(yyyyFirst[3]))
  }

  const ddFirst = cleaned.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (ddFirst) {
    const day = Number(ddFirst[1])
    const month = Number(ddFirst[2])
    let year = Number(ddFirst[3])
    if (year < 100) year = 2000 + year
    return toIsoDate(year, month, day)
  }

  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }

  const dayMonthName = cleaned.match(/^(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{2,4})$/i)
  if (dayMonthName) {
    const day = Number(dayMonthName[1])
    const month = monthMap[dayMonthName[2].slice(0, 3).toLowerCase()]
    let year = Number(dayMonthName[3])
    if (year < 100) year = 2000 + year
    return toIsoDate(year, month, day)
  }

  const monthNameDay = cleaned.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})\s*(\d{2,4})$/i)
  if (monthNameDay) {
    const month = monthMap[monthNameDay[1].slice(0, 3).toLowerCase()]
    const day = Number(monthNameDay[2])
    let year = Number(monthNameDay[3])
    if (year < 100) year = 2000 + year
    return toIsoDate(year, month, day)
  }

  return null
}

function extractExpiryDate(text: string): string | null {
  const candidates: string[] = []

  const numeric = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b/g) ?? []
  candidates.push(...numeric)

  const monthNamed = text.match(/\b\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}\b/gi) ?? []
  candidates.push(...monthNamed)

  const monthNamedAlt = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}\s*\d{2,4}\b/gi) ?? []
  candidates.push(...monthNamedAlt)

  for (const token of candidates) {
    const parsed = parseDateToken(token)
    if (parsed) return parsed
  }

  return null
}

function inferCategory(text: string): string {
  const value = text.toLowerCase()

  if (/milk|cheese|curd|yogurt|butter|paneer/.test(value)) return 'dairy'
  if (/chicken|beef|mutton|pork|sausage/.test(value)) return 'meat'
  if (/fish|prawn|shrimp|salmon|tuna/.test(value)) return 'seafood'
  if (/apple|banana|tomato|potato|onion|vegetable|fruit|spinach/.test(value)) return 'produce'
  if (/frozen|ice cream/.test(value)) return 'frozen'
  if (/rice|flour|atta|grain|lentil|dal/.test(value)) return 'grains'
  if (/bread|bun|bagel/.test(value)) return 'bread'
  if (/juice|soda|coffee|tea|drink|beverage/.test(value)) return 'beverages'
  if (/chips|biscuit|cookie|snack|chocolate/.test(value)) return 'snacks'
  if (/oil|spice|salt|sugar|sauce|ketchup|noodle|pasta/.test(value)) return 'pantry'

  return 'other'
}

function extractBarcode(text: string): string | null {
  const matches = text.match(/\b\d{8,14}\b/g)
  if (!matches || matches.length === 0) return null
  return [...matches].sort((a, b) => b.length - a.length)[0]
}

async function fetchProductNameFromBarcode(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { status?: number; product?: { product_name?: string; product_name_en?: string } }
    if (data.status !== 1) return null
    const name = data.product?.product_name || data.product?.product_name_en || ''
    const normalized = normalizeWhitespace(name)
    return normalized.length > 0 ? normalized : null
  } catch {
    return null
  }
}

function chooseProductName(text: string, labels: string[]): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

  const lineCandidate = lines.find((line) => !/^\d{8,14}$/.test(line))
  if (lineCandidate) return lineCandidate

  const labelCandidate = labels.find((label) => normalizeWhitespace(label).length > 2)
  if (labelCandidate) return normalizeWhitespace(labelCandidate)

  return 'Scanned Item'
}

async function annotateWithCloudVision(imageBase64: string, features: string[]): Promise<VisionAnnotation | null> {
  if (!CLOUD_VISION_API_KEY) return null

  const response = await fetch(`${VISION_ENDPOINT}?key=${CLOUD_VISION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: features.map((type) => ({ type, maxResults: 10 })),
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(`Cloud Vision request failed (${response.status}): ${payload}`)
  }

  const payload = await response.json() as { responses?: VisionAnnotation[] }
  return payload.responses?.[0] ?? null
}

async function detectProductViaCloudVision(imageBase64: string, mode: 'product' | 'barcode'): Promise<ProductVisionResult | null> {
  const features = mode === 'barcode'
    ? ['BARCODE_DETECTION', 'TEXT_DETECTION', 'LABEL_DETECTION']
    : ['TEXT_DETECTION', 'LABEL_DETECTION', 'OBJECT_LOCALIZATION']

  const annotation = await annotateWithCloudVision(imageBase64, features)
  if (!annotation) return null

  const fullText = normalizeWhitespace(annotation.fullTextAnnotation?.text || annotation.textAnnotations?.[0]?.description || '')
  const labels = (annotation.labelAnnotations ?? [])
    .map((label) => normalizeWhitespace(label.description || ''))
    .filter(Boolean)
  const objects = (annotation.localizedObjectAnnotations ?? [])
    .map((obj) => normalizeWhitespace(obj.name || ''))
    .filter(Boolean)

  const combinedText = [fullText, ...labels, ...objects].join(' ')
  const expiryDate = extractExpiryDate(combinedText)
  const category = inferCategory(combinedText)

  const barcode = extractBarcode(fullText)
  const barcodeProduct = barcode ? await fetchProductNameFromBarcode(barcode) : null
  const productName = barcodeProduct || chooseProductName(fullText, [...labels, ...objects])

  const confidenceScore = Math.max(
    annotation.labelAnnotations?.[0]?.score ?? 0,
    annotation.localizedObjectAnnotations?.[0]?.score ?? 0,
    fullText ? 0.72 : 0,
  )

  return {
    productName,
    expiryDate,
    category,
    confidence: Number(Math.min(1, Math.max(0.5, confidenceScore)).toFixed(2)),
    barcode: mode === 'barcode' ? barcode : null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, mode = 'product' } = await req.json()

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'Missing image data or MIME type' }, { status: 400 })
    }

    const imagePart = buildImagePart(imageBase64, mimeType)

    if (mode === 'product' || mode === 'barcode') {
      try {
        const cloudResult = await detectProductViaCloudVision(imageBase64, mode)
        if (cloudResult) {
          return NextResponse.json(cloudResult)
        }
      } catch (visionError) {
        console.error('[vision/cloud-vision]', visionError)
      }

      const prompt = mode === 'barcode'
        ? `Analyze this barcode/product image. Extract the barcode number if visible, then identify the product.
Return JSON: {"productName": string, "expiryDate": string|null, "category": string, "barcode": string|null, "confidence": number}`
        : `Analyze this product image and extract:
1. Product name (specific, e.g. "Whole Milk 2%" not just "Milk")
2. Expiry/Best Before date (return in YYYY-MM-DD format, or null if not visible)
3. Product category (one of: dairy, meat, seafood, produce, frozen, pantry, grains, snacks, bread, beverages, other)
4. Your confidence level (0.0-1.0)

Return JSON: {"productName": string, "expiryDate": string|null, "category": string, "confidence": number}`

      try {
        const data = await generateStructuredJSONFromParts<VisionProductResponse & { barcode?: string | null }>(
          geminiFlash,
          [imagePart],
          prompt,
        )
        return NextResponse.json(data)
      } catch (geminiError) {
        console.error('[vision/gemini-fallback]', geminiError)
      }

      return NextResponse.json({
        productName: mode === 'barcode' ? 'Scanned Barcode Item' : 'Scanned Item',
        expiryDate: null,
        category: 'other',
        confidence: 0.5,
        barcode: null,
      } satisfies ProductVisionResult)
    }

    if (mode === 'prescription') {
      try {
        const data = await generateStructuredJSONFromParts<VisionPrescriptionResponse>(
          geminiFlash,
          [imagePart],
          `Analyze this medical prescription image and extract:
1. All medications with name, dosage, and frequency
2. Course length (e.g., "7 days", "1 month", "ongoing")
3. Start date if visible (YYYY-MM-DD format, or null)
4. Confidence score (0.0-1.0, lower for handwritten)

Return JSON: {
  "medications": [{"name": string, "dosage": string, "frequency": string}],
  "courseLength": string,
  "startDate": string|null,
  "confidence": number
}`,
        )
        return NextResponse.json(data)
      } catch (prescErr) {
        console.error('[vision/prescription]', prescErr)
        return NextResponse.json({
          medications: [],
          courseLength: '',
          startDate: null,
          confidence: 0,
          error: 'Could not extract prescription details from image.',
        }, { status: 200 })
      }
    }

    if (mode === 'csv') {
      const csvText = Buffer.from(imageBase64, 'base64').toString('utf-8')
      const data = await generateStructuredJSON<{
        assets: { name: string; category: string; estimatedValue: number; purchaseDate: string | null }[]
      }>(
        geminiFlash,
        `Analyze this bank statement CSV and identify purchases of physical goods that are high-value assets (electronics, appliances, furniture).
CSV content:
${csvText.slice(0, 4000)}

Return JSON: {
  "assets": [
    {"name": string, "category": "electronics"|"appliances"|"other", "estimatedValue": number, "purchaseDate": string|null}
  ]
}`,
      )
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (err) {
    console.error('[vision]', err)
    return NextResponse.json({ error: 'Vision analysis failed' }, { status: 500 })
  }
}

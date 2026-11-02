import { NextRequest, NextResponse } from 'next/server'
import { geminiFlash, buildAudioPart, generateStructuredJSONFromParts } from '@/lib/gemini'
import type { AudioDiagnosticResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType } = await req.json()

    if (!audioBase64 || !mimeType) {
      return NextResponse.json({ error: 'Missing audio data or MIME type' }, { status: 400 })
    }

    const audioPart = buildAudioPart(audioBase64, mimeType)

    const parsed = await generateStructuredJSONFromParts<AudioDiagnosticResponse>(
      geminiFlash,
      [audioPart],
      `You are an appliance acoustic diagnostic AI. Analyze this 10-second audio recording from a household appliance.

Evaluate:
1. Sound patterns and anomalies (unusual vibrations, grinding, rattling, hissing, clicking, irregular humming)
2. Overall health score (0-100, where 100=perfect, <60=needs attention, <30=urgent service required)
3. Specific anomalies detected (be specific, e.g. "irregular motor cycling", "bearing wear", "blocked filter")
4. Recommended action

Return JSON:
{
  "healthScore": number,
  "anomalies": string[],
  "recommendation": string,
  "noiseProfile": string
}`
    )

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[audio]', err)
    return NextResponse.json(
      {
        healthScore: 50,
        anomalies: ['Analysis failed - audio quality may be insufficient'],
        recommendation: 'Retry with the appliance running in a quieter environment',
        noiseProfile: 'Inconclusive',
      },
      { status: 200 }
    )
  }
}

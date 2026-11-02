import { NextRequest, NextResponse } from 'next/server'
import { updateSmartPairingPreferences } from '@/lib/database'
import type { PairingMode, ProfileVisibility } from '@/types'

function isPairingMode(value: unknown): value is PairingMode {
  return value === 'private' || value === 'passive' || value === 'active' || value === 'social'
}

function isProfileVisibility(value: unknown): value is ProfileVisibility {
  return value === 'anonymous' || value === 'matched' || value === 'public'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid = typeof body?.uid === 'string' ? body.uid : ''

    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 })
    }

    const pairingMode = isPairingMode(body?.pairingMode) ? body.pairingMode : undefined
    const profileVisibility = isProfileVisibility(body?.profileVisibility) ? body.profileVisibility : undefined
    const buildingId = typeof body?.buildingId === 'string' ? body.buildingId : undefined
    const clusterId = typeof body?.clusterId === 'string' ? body.clusterId : undefined
    const pairingDisplayName = typeof body?.pairingDisplayName === 'string' ? body.pairingDisplayName : undefined

    await updateSmartPairingPreferences(uid, {
      pairingMode,
      profileVisibility,
      buildingId,
      clusterId,
      pairingDisplayName,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[smart-pairing/settings]', error)
    return NextResponse.json({ error: 'Failed to update smart pairing settings' }, { status: 500 })
  }
}

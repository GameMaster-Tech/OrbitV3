import { NextRequest, NextResponse } from 'next/server'
import {
  createSmartPairSwapRequest,
  declineSmartPairMatch,
  markSmartPairMatchViewed,
  requestCookTogether,
  respondToCookRequest,
  respondToSwapRequest,
} from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid = typeof body?.uid === 'string' ? body.uid : ''
    const action = typeof body?.action === 'string' ? body.action : ''

    if (!uid || !action) {
      return NextResponse.json({ error: 'uid and action are required' }, { status: 400 })
    }

    if (action === 'mark_viewed') {
      const matchId = typeof body?.matchId === 'string' ? body.matchId : ''
      if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
      await markSmartPairMatchViewed(uid, matchId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'request_swap') {
      const matchId = typeof body?.matchId === 'string' ? body.matchId : ''
      if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })

      const requestedItemNames = Array.isArray(body?.requestedItemNames)
        ? body.requestedItemNames.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
        : []
      const offeredItemNames = Array.isArray(body?.offeredItemNames)
        ? body.offeredItemNames.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
        : []
      const message = typeof body?.message === 'string'
        ? body.message
        : 'Hi! Orbit found a meal match nearby. Want to swap ingredients?'

      const requestId = await createSmartPairSwapRequest(uid, matchId, requestedItemNames, offeredItemNames, message)
      return NextResponse.json({ ok: true, requestId })
    }

    if (action === 'respond_swap') {
      const requestId = typeof body?.requestId === 'string' ? body.requestId : ''
      const response = body?.response === 'accepted' ? 'accepted' : body?.response === 'declined' ? 'declined' : ''
      if (!requestId || !response) {
        return NextResponse.json({ error: 'requestId and valid response are required' }, { status: 400 })
      }
      await respondToSwapRequest(uid, requestId, response)
      return NextResponse.json({ ok: true })
    }

    if (action === 'request_cook') {
      const matchId = typeof body?.matchId === 'string' ? body.matchId : ''
      if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
      await requestCookTogether(uid, matchId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'respond_cook') {
      const matchId = typeof body?.matchId === 'string' ? body.matchId : ''
      const accepted = Boolean(body?.accepted)
      if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
      await respondToCookRequest(uid, matchId, accepted)
      return NextResponse.json({ ok: true })
    }

    if (action === 'decline_match') {
      const matchId = typeof body?.matchId === 'string' ? body.matchId : ''
      if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
      await declineSmartPairMatch(uid, matchId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[smart-pairing/action]', error)
    return NextResponse.json({ error: 'Smart pairing action failed' }, { status: 500 })
  }
}


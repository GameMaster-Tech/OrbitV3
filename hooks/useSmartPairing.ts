'use client'
import { useCallback, useEffect, useState } from 'react'
import { listenSmartPairMatches, listenSwapRequests } from '@/lib/database'
import type { PairingMode, ProfileVisibility, SmartPairFallback, SmartPairMatch, SwapRequest } from '@/types'

type DiscoverResponse = {
  suggestions: Array<Record<string, unknown>>
  fallback: SmartPairFallback | null
  scannedNearbyUsers: number
}

export function useSmartPairing(uid: string | undefined) {
  const [matches, setMatches] = useState<SmartPairMatch[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [fallback, setFallback] = useState<SmartPairFallback | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scannedNearbyUsers, setScannedNearbyUsers] = useState(0)

  useEffect(() => {
    if (!uid) {
      setMatches([])
      setSwapRequests([])
      setLoading(false)
      return
    }

    const unsubMatches = listenSmartPairMatches(uid, (data) => {
      setMatches(data)
      setLoading(false)
    })
    const unsubRequests = listenSwapRequests(uid, setSwapRequests)

    return () => {
      unsubMatches()
      unsubRequests()
    }
  }, [uid])

  const discoverMatches = useCallback(async (expandRadius = false) => {
    if (!uid) return
    setRefreshing(true)

    try {
      const res = await fetch('/api/smart-pairing/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, expandRadius }),
      })

      const payload = (await res.json()) as DiscoverResponse
      setFallback(payload.fallback ?? null)
      setScannedNearbyUsers(Number(payload.scannedNearbyUsers ?? 0))
    } catch (error) {
      console.error(error)
    } finally {
      setRefreshing(false)
    }
  }, [uid])

  const runAction = useCallback(async (body: Record<string, unknown>) => {
    if (!uid) return
    const res = await fetch('/api/smart-pairing/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...body }),
    })
    if (!res.ok) {
      throw new Error(`Smart pairing action failed (${res.status})`)
    }
  }, [uid])

  const updateSettings = useCallback(async (settings: {
    pairingMode?: PairingMode
    profileVisibility?: ProfileVisibility
    buildingId?: string
    clusterId?: string
    pairingDisplayName?: string
  }) => {
    if (!uid) return
    const res = await fetch('/api/smart-pairing/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...settings }),
    })
    if (!res.ok) {
      throw new Error(`Smart pairing settings update failed (${res.status})`)
    }
  }, [uid])

  const markViewed = useCallback(async (matchId: string) => {
    await runAction({ action: 'mark_viewed', matchId })
  }, [runAction])

  const requestSwap = useCallback(async (matchId: string, requestedItemNames: string[], offeredItemNames: string[], message?: string) => {
    await runAction({
      action: 'request_swap',
      matchId,
      requestedItemNames,
      offeredItemNames,
      message,
    })
  }, [runAction])

  const respondSwap = useCallback(async (requestId: string, response: 'accepted' | 'declined') => {
    await runAction({ action: 'respond_swap', requestId, response })
  }, [runAction])

  const requestCook = useCallback(async (matchId: string) => {
    await runAction({ action: 'request_cook', matchId })
  }, [runAction])

  const respondCook = useCallback(async (matchId: string, accepted: boolean) => {
    await runAction({ action: 'respond_cook', matchId, accepted })
  }, [runAction])

  const declineMatch = useCallback(async (matchId: string) => {
    await runAction({ action: 'decline_match', matchId })
  }, [runAction])

  return {
    matches,
    swapRequests,
    fallback,
    loading,
    refreshing,
    scannedNearbyUsers,
    discoverMatches,
    markViewed,
    requestSwap,
    respondSwap,
    requestCook,
    respondCook,
    declineMatch,
    updateSettings,
  }
}


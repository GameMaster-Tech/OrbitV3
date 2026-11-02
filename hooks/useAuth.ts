'use client'
import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfile, createUserProfile, createDefaultZones, createWallet, listenUserProfile } from '@/lib/firestore'
import { getCommunityKey } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { Unsubscribe } from 'firebase/database'

async function loadProfileAfterToken(uid: string) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getUserProfile(uid)
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }
  throw lastError
}

export function useAuth() {
  const { user, profile, isLoading, error, setUser, setProfile, setLoading, setError, clearError, signOut } = useAuthStore()

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    let profileUnsub: Unsubscribe | null = null

    const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true)
      if (profileUnsub) {
        profileUnsub()
        profileUnsub = null
      }

      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(firebaseUser)
      setError(null)

      try {
        // Ensure auth token is fresh before querying database
        await firebaseUser.getIdToken()
        let userProfile = await loadProfileAfterToken(firebaseUser.uid)

        if (!userProfile) {
          try {
            await createUserProfile(firebaseUser.uid, {
              email:       firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? 'Orbit User',
              photoURL:    firebaseUser.photoURL ?? '',
              location:    { city: '', state: '', country: '' },
              creditBalance: 50,
              pairingMode: 'passive',
              clusterId: getCommunityKey('unknown', 'unknown'),
              buildingId: getCommunityKey('unknown', 'unknown'),
              pairingDisplayName: (firebaseUser.displayName ?? 'Orbit User').split(' ')[0],
              profileVisibility: 'matched',
              createdAt:   new Date(firebaseUser.metadata.creationTime ?? Date.now()),
              lastActive:  new Date(),
            })
            await createWallet(firebaseUser.uid)
            await createDefaultZones(firebaseUser.uid)
            userProfile = await loadProfileAfterToken(firebaseUser.uid)
          } catch (initErr) {
            console.warn('Initial profile creation encountered error, attempting recovery:', initErr)
          }
        }

        // If still null (e.g. database offline or restrictive security rules during dev), construct client-side fallback
        if (!userProfile) {
          userProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? 'Orbit User',
            photoURL: firebaseUser.photoURL ?? '',
            location: { city: '', state: '', country: '' },
            creditBalance: 50,
            pairingMode: 'passive',
            clusterId: getCommunityKey('unknown', 'unknown'),
            buildingId: getCommunityKey('unknown', 'unknown'),
            pairingDisplayName: (firebaseUser.displayName ?? 'Orbit User').split(' ')[0],
            profileVisibility: 'matched',
            createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
            lastActive: new Date(),
          }
        }

        setProfile(userProfile)
        setError(null)

        // Realtime listener for credit balance and profile updates
        try {
          profileUnsub = listenUserProfile(firebaseUser.uid, (updatedProfile) => {
            if (updatedProfile) setProfile(updatedProfile)
          })
        } catch {
          // Non-blocking if listener fails
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
        // Ensure user can still access the dashboard with a fallback profile
        const fallbackProfile: import('@/types').UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? 'Orbit User',
          photoURL: firebaseUser.photoURL ?? '',
          location: { city: '', state: '', country: '' },
          creditBalance: 50,
          pairingMode: 'passive',
          clusterId: getCommunityKey('unknown', 'unknown'),
          buildingId: getCommunityKey('unknown', 'unknown'),
          pairingDisplayName: (firebaseUser.displayName ?? 'Orbit User').split(' ')[0],
          profileVisibility: 'matched',
          createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
          lastActive: new Date(),
        }
        setProfile(fallbackProfile)
        setError(null)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      unsub()
      if (profileUnsub) profileUnsub()
    }
  }, [setUser, setProfile, setLoading, setError])

  return { user, profile, isLoading, error, clearError, signOut }
}

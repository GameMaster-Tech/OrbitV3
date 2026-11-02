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
        // Wait for a fresh token before the first Realtime Database read. This
        // avoids the short window after sign-in where rules can reject a request.
        await firebaseUser.getIdToken()
        let userProfile = await loadProfileAfterToken(firebaseUser.uid)

        if (!userProfile) {
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
        }

        setProfile(userProfile)

        // Realtime listener for credit balance and profile updates
        profileUnsub = listenUserProfile(firebaseUser.uid, (updatedProfile) => {
          if (updatedProfile) setProfile(updatedProfile)
        })
      } catch (err) {
        console.error('Failed to load user profile:', err)
        setProfile(null)
        setError('Your account is signed in, but Orbit could not load its private profile. Check the Realtime Database rules and try again.')
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

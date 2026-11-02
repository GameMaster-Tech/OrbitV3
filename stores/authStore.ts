import { create } from 'zustand'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createUserProfile, createDefaultZones, createWallet } from '@/lib/firestore'
import { getCommunityKey } from '@/lib/utils'
import type { UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  setUser: (u: User | null) => void
  setProfile: (p: UserProfile | null) => void
  setLoading: (b: boolean) => void
  setError: (message: string | null) => void
  clearError: () => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, city: string, state: string) => Promise<void>
  signOut: () => Promise<void>
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  signInWithGoogle: async () => {
    if (!auth) {
      set({ error: 'Firebase not configured', isLoading: false })
      return
    }

    set({ error: null, isLoading: true })
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (error: unknown) {
      set({ error: toErrorMessage(error), isLoading: false })
    }
  },

  signInWithEmail: async (email, password) => {
    if (!auth) {
      set({ error: 'Firebase not configured', isLoading: false })
      return
    }

    set({ error: null, isLoading: true })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: unknown) {
      set({ error: toErrorMessage(error), isLoading: false })
    }
  },

  signUp: async (email, password, displayName, city, state) => {
    if (!auth) {
      set({ error: 'Firebase not configured', isLoading: false })
      return
    }

    set({ error: null, isLoading: true })
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName })

      await createUserProfile(credential.user.uid, {
        email,
        displayName,
        photoURL: '',
        location: { city, state, country: '' },
        creditBalance: 50,
        pairingMode: 'passive',
        clusterId: getCommunityKey(city || 'unknown', state || 'unknown'),
        buildingId: getCommunityKey(city || 'unknown', state || 'unknown'),
        pairingDisplayName: displayName.split(' ')[0] || displayName,
        profileVisibility: 'matched',
        createdAt: new Date(),
        lastActive: new Date(),
      })

      await createWallet(credential.user.uid)
      await createDefaultZones(credential.user.uid)
    } catch (error: unknown) {
      set({ error: toErrorMessage(error), isLoading: false })
    }
  },

  signOut: async () => {
    if (auth) await firebaseSignOut(auth)
    set({ user: null, profile: null })
  },
}))


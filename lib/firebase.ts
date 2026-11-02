import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

let app:  FirebaseApp | null = null
let auth: Auth        | null = null
let rtdb: Database    | null = null

// Initialise on both client and server (API routes need rtdb too)
if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
  app  = getApps().length ? getApp() : initializeApp(firebaseConfig)
  rtdb = getDatabase(app)
  // Auth is only meaningful client-side
  if (typeof window !== 'undefined') {
    auth = getAuth(app)
  }
}

export { auth, rtdb }
export const db = rtdb

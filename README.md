# Orbit — AI-Powered Household Management Platform

> **Live demo:** https://orbitv3.vercel.app

Orbit is a production-ready, full-stack household command center that applies AI at every layer — from predicting food expiry dates to detecting medication conflicts, simulating life scenarios, and powering a real community marketplace.

---

## Features

| Module | What it does |
|---|---|
| **Smart Inventory** | Track groceries, electronics, appliances, documents with category-specific fields |
| **Storage Zone Intelligence** | Q10 temperature-kinetics model adjusts expiry dates based on where items are stored |
| **AI Predicted Expiry** | Groq LLM predicts realistic expiry dates per item, shown alongside label dates |
| **Smart Alerts** | Real-time cards for expiring food, warranty deadlines, document renewals, budget overruns |
| **Health Profile** | Allergy/medication tracking with AI conflict detection on every new item added |
| **Wallet & Budgets** | Full expense tracking, budget limits, auto-sync from inventory purchases |
| **SwapSync** | Cross-user community marketplace — list expiring items, earn credits, reduce waste |
| **Smart Pairing** | Privacy-first meal-match engine — pairs users by expiring ingredients for shared cooking |
| **AI Assistant** | Context-aware conversational AI with full household data access |
| **Get Flavored** | Zero-waste recipe engine powered by Gemini, auto-saves to Recipe Library |
| **Recipe Library** | Persistent recipe store with pantry match scoring and favorite/cooked toggles |
| **Household Sim** | Scenario simulator — "What if 6 guests come for dinner?" — powered by Groq |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Firebase Realtime Database
- **Auth:** Firebase Authentication (email/password + Google OAuth)
- **AI — Fast inference:** Groq (Llama 3.3 70B) — assistant, health check, expiry prediction, sim
- **AI — Multimodal:** Google Gemini 2.0 Flash — vision scanning, recipe generation, oracle insights
- **Vision:** Google Cloud Vision API + Open Food Facts (barcode lookup)
- **State:** Zustand (auth), React real-time listeners (data)
- **Animations:** Framer Motion
- **Styling:** Tailwind CSS v4, custom design system

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Realtime Database enabled
- Groq API key
- Google Gemini API key

### Installation

```bash
git clone https://github.com/GameMaster-Tech/OrbitV3.git
cd OrbitV3
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# AI (server-side only)
GEMINI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLOUD_VISION_API_KEY=   # optional — Gemini fallback used if absent
```

### Run

```bash
npm run dev       # development server
npm test          # run test suite
npm run build     # production build
```

---

## Project Structure

```
app/
├── api/               # Next.js API routes (AI, sync, smart pairing)
│   ├── ai/            # Groq + Gemini endpoints
│   └── smart-pairing/ # Smart pairing discovery + actions
├── dashboard/         # Main dashboard with smart alerts
├── inventory/         # Multi-category inventory management
├── wallet/            # Expenses and budget tracking
├── health/            # Health profile and medication tracker
├── swapsync/          # Community marketplace
├── smart-pairing/     # Meal match engine
├── assistant/         # AI chat interface
├── get-flavored/      # Recipe generation
├── library/           # Saved recipe library
└── sandbox/           # Household scenario simulator
components/
├── layout/            # AppShell, Sidebar, TopBar
└── ui/                # SmartCard, Toaster, GlassCard
hooks/                 # Data hooks (inventory, wallet, smart cards, auth)
lib/                   # Firebase, AI clients, zone service, utils
stores/                # Zustand auth store
tests/                 # Unit tests
types/                 # Shared TypeScript types
```

---

## Testing

Tests use Node.js built-in test runner — no extra dependencies:

```bash
npm test
```

Coverage includes: utility functions, storage zone decay calculations, smart alert priority logic, expense/budget calculations, ingredient normalisation.

---

## Deployment

Deployed on Vercel. Every push to `master` triggers an automatic deployment.

After deploying, add your Vercel domain to:
1. Firebase Console → Authentication → Authorized Domains
2. Google Cloud Console → OAuth 2.0 → Authorized redirect URIs (`https://yourdomain/__/auth/handler`)

---

## Firebase RTDB Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "communities": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "smartPairing": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## License

MIT — see [LICENSE](./LICENSE)

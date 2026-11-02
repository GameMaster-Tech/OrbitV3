'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ChefHat,
  Clock,
  Handshake,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useSmartPairing } from '@/hooks/useSmartPairing'
import type { PairingMode, ProfileVisibility, SmartPairMatch } from '@/types'

export default function SmartPairingPage() {
  const { user, profile } = useAuthStore()
  const { items } = useInventory(user?.uid)
  const {
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
  } = useSmartPairing(user?.uid)

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [requestedNames, setRequestedNames] = useState('')
  const [offeredNames, setOfferedNames] = useState('')
  const [customMessage, setCustomMessage] = useState('Hi! Orbit found a meal match nearby. Want to swap ingredients?')
  const [expandRadius, setExpandRadius] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [pairingMode, setPairingMode] = useState<PairingMode>(profile?.pairingMode ?? 'passive')
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(profile?.profileVisibility ?? 'matched')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    discoverMatches(false)
  }, [user?.uid, discoverMatches])

  useEffect(() => {
    setPairingMode(profile?.pairingMode ?? 'passive')
    setProfileVisibility(profile?.profileVisibility ?? 'matched')
  }, [profile?.pairingMode, profile?.profileVisibility])

  const activeMatches = useMemo(
    () => matches.filter((match) => match.status !== 'declined' && match.status !== 'expired'),
    [matches],
  )

  const selected = activeMatches.find((match) => match.id === selectedMatchId) ?? activeMatches[0] ?? null

  useEffect(() => {
    if (!selected || selected.status !== 'notified') return
    markViewed(selected.id)
  }, [selected, markViewed])

  const expiringKitchenCount = useMemo(() => {
    return items.filter((item) => item.tab === 'kitchen' && item.expiryDate).length
  }, [items])

  const parseNames = (value: string) => {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }

  const unlockRecipe = async (matchId: string) => {
    await markViewed(matchId)
    setUnlockedIds((prev) => prev.includes(matchId) ? prev : [...prev, matchId])
  }

  const recipeSteps = (match: SmartPairMatch) => {
    const your = match.yourIngredients[0] ?? 'your expiring ingredient'
    const nearby = match.nearbyComplementaryIngredients[0] ?? 'nearby surplus ingredient'
    const missing = match.missingIngredients[0] ?? 'salt and pepper'
    return [
      `Prep ${your} and ${nearby} into cook-ready pieces.`,
      `Build your base in a pan with aromatics and ${missing}.`,
      `Cook both ingredient sets together until flavors bind and texture is tender.`,
      'Taste-adjust, plate warm, and finish with herbs or citrus.',
    ]
  }

  const onSwapSubmit = async () => {
    if (!selected) return
    await requestSwap(
      selected.id,
      parseNames(requestedNames),
      parseNames(offeredNames),
      customMessage,
    )
    setShowSwapModal(false)
  }

  const onSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await updateSettings({
        pairingMode,
        profileVisibility,
        buildingId: profile?.buildingId || profile?.clusterId,
        clusterId: profile?.clusterId,
        pairingDisplayName: profile?.pairingDisplayName || profile?.displayName?.split(' ')[0],
      })
      await discoverMatches(expandRadius)
    } finally {
      setSavingSettings(false)
    }
  }

  if (!user || !profile) return null

  return (
    <AppShell title="Smart Pairing" subtitle="High-confidence meal opportunities from nearby expiring items">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #0F172A 0%, #1D4ED8 35%, #0EA5E9 70%, #22C55E 100%)',
            boxShadow: '0 18px 44px rgba(30,58,138,0.32)',
          }}>
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.26), transparent)' }} />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-white/90" />
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-white/80">Privacy-first utility</span>
              </div>
              <h2 className="font-display text-2xl italic text-white">Meal Match Nearby</h2>
              <p className="font-sans text-sm mt-1 text-white/75 max-w-xl">
                Orbit only shows high-confidence pairings that can realistically form a complete meal. Identity stays hidden until mutual acceptance.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                <Users className="w-3 h-3" /> Nearby users scanned: {scannedNearbyUsers}
              </span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                <UtensilsCrossed className="w-3 h-3" /> Kitchen items tracked: {expiringKitchenCount}
              </span>
              <button
                onClick={() => discoverMatches(expandRadius)}
                className="btn-ghost gap-1.5"
                style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'rgba(255,255,255,0.28)' }}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="section-label">Smart Pair Match Card</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pairingMode}
              onChange={(event) => setPairingMode(event.target.value as PairingMode)}
              className="orbit-input text-xs min-w-[120px]"
            >
              <option value="private">private</option>
              <option value="passive">passive</option>
              <option value="active">active</option>
              <option value="social">social</option>
            </select>
            <select
              value={profileVisibility}
              onChange={(event) => setProfileVisibility(event.target.value as ProfileVisibility)}
              className="orbit-input text-xs min-w-[120px]"
            >
              <option value="anonymous">anonymous</option>
              <option value="matched">matched</option>
              <option value="public">public</option>
            </select>
            <button onClick={onSaveSettings} className="btn-ghost text-xs" disabled={savingSettings}>
              {savingSettings ? 'Saving…' : 'Save Pairing Settings'}
            </button>
            <button
              onClick={() => {
                const next = !expandRadius
                setExpandRadius(next)
                discoverMatches(next)
              }}
              className="btn-ghost text-xs"
            >
              {expandRadius ? 'Radius: Expanded' : 'Expand Match Radius'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card card-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>Analyzing expiring ingredients nearby...</p>
          </div>
        ) : activeMatches.length === 0 ? (
          <div className="space-y-4">
            <div className="card card-lg">
              <p className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>No Nearby Match Yet</p>
              <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>
                But you can still use your expiring ingredients tonight.
              </p>

              {fallback && (
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#4F46E5' }}>Solo recipe suggestions</p>
                    <ul className="space-y-1">
                      {fallback.soloSuggestions.map((item, index) => (
                        <li key={index} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#059669' }}>Substitutions</p>
                    <ul className="space-y-1">
                      {fallback.substitutions.map((item, index) => (
                        <li key={index} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {activeMatches.map((match) => (
                <motion.button
                  key={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className="w-full text-left card card-md transition-all"
                  style={selected?.id === match.id
                    ? { borderColor: 'rgba(59,130,246,0.55)', boxShadow: '0 10px 28px rgba(59,130,246,0.18)' }
                    : undefined}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>{match.recipeName}</p>
                      <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>{match.nearbyLabel}</p>
                    </div>
                    <span className="badge" style={{ background: 'rgba(16,185,129,0.14)', color: '#059669' }}>
                      Great Match {match.confidenceScore}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="badge badge-muted"><Clock className="w-3 h-3" /> {match.estimatedTimeMinutes} min</span>
                    <span className="badge badge-primary">{match.difficulty}</span>
                    <span className="badge badge-accent">{match.status.replace('_', ' ')}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-sans text-xs font-medium" style={{ color: 'var(--muted)' }}>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--dim)' }} />
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="lg:col-span-3">
              {selected && (
                <div className="card card-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="section-label mb-1">Match Detail</p>
                      <h3 className="font-display text-2xl italic" style={{ color: 'var(--text)' }}>Meal Match Nearby</h3>
                      <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>{selected.recipeName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge" style={{ background: 'rgba(16,185,129,0.14)', color: '#059669' }}>{selected.confidenceScore} confidence</span>
                      <span className="badge badge-muted"><MapPin className="w-3 h-3" /> {selected.nearbyLabel}</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 mt-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#4F46E5' }}>Use your ingredients</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{selected.yourIngredients.join(', ') || 'None listed'}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(5,150,105,0.08)' }}>
                      <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#059669' }}>Nearby surplus can complete this meal</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{selected.nearbyComplementaryIngredients.join(', ') || 'None listed'}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(217,119,6,0.08)' }}>
                      <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#D97706' }}>Still missing</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{selected.missingIngredients.join(', ') || 'Nothing critical'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="badge badge-muted"><Clock className="w-3 h-3" /> {selected.estimatedTimeMinutes} min</span>
                    <span className="badge badge-primary">{selected.difficulty}</span>
                    <span className="badge badge-warning">Viability {selected.mealViabilityScore}</span>
                    <span className="badge badge-critical">Urgency {selected.expiryUrgencyScore}</span>
                  </div>

                  <div className="mt-5 flex items-center gap-2 flex-wrap">
                    <button className="btn-primary gap-1.5" onClick={() => unlockRecipe(selected.id)}>
                      <ChefHat className="w-3.5 h-3.5" /> Unlock Recipe
                    </button>
                    <button className="btn-ghost gap-1.5" onClick={() => setShowSwapModal(true)}>
                      <Handshake className="w-3.5 h-3.5" /> Request Ingredient Swap
                    </button>
                    {profile.pairingMode === 'social' && selected.actions.includes('cook_together') && (
                      <button className="btn-ghost gap-1.5" onClick={() => requestCook(selected.id)}>
                        <Users className="w-3.5 h-3.5" /> Cook Together
                      </button>
                    )}
                    <button className="btn-ghost text-xs" onClick={() => declineMatch(selected.id)}>
                      Dismiss Match
                    </button>
                  </div>

                  {selected.status === 'cook_requested' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button className="btn-primary text-xs" onClick={() => respondCook(selected.id, true)}>Accept Cook Together</button>
                      <button className="btn-ghost text-xs" onClick={() => respondCook(selected.id, false)}>Decline</button>
                    </div>
                  )}

                  {(unlockedIds.includes(selected.id) || ['viewed', 'swap_requested', 'swap_accepted', 'cook_requested', 'cook_accepted'].includes(selected.status)) && (
                    <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: 'rgba(37,99,235,0.28)', background: 'rgba(37,99,235,0.06)' }}>
                      <p className="font-sans text-xs font-semibold mb-1" style={{ color: '#1D4ED8' }}>Unlocked Recipe Guide</p>
                      <ol className="space-y-1">
                        {recipeSteps(selected).map((step, index) => (
                          <li key={index} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                            {index + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--elevated)' }}>
                    <p className="font-sans text-xs font-semibold" style={{ color: 'var(--muted)' }}>Identity & coordination</p>
                    <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {selected.mutualOptInRevealed
                        ? `Mutual opt-in confirmed. You can coordinate with ${selected.counterpartDisplayName ?? 'the nearby Orbit user'}.`
                        : 'A nearby Orbit user. Identity remains hidden until both sides accept swap or cook coordination.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {swapRequests.length > 0 && (
          <div className="card card-lg">
            <p className="section-label mb-2">Swap Requests</p>
            <div className="space-y-2">
              {swapRequests.map((request) => (
                <div key={request.id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>Meal match swap request</p>
                  <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>{request.message || 'Hi! Orbit found a meal match nearby. Want to swap ingredients?'}</p>
                  <p className="font-sans text-xs mt-1" style={{ color: 'var(--dim)' }}>Status: {request.status}</p>

                  {request.status === 'pending' && request.requestingUserId !== user.uid && (
                    <div className="mt-2 flex items-center gap-2">
                      <button className="btn-primary text-xs" onClick={() => respondSwap(request.id, 'accepted')}>Accept</button>
                      <button className="btn-ghost text-xs" onClick={() => respondSwap(request.id, 'declined')}>Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showSwapModal && selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowSwapModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(event) => event.stopPropagation()}
                className="card card-lg w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>Request Ingredient Swap</h4>
                  <button onClick={() => setShowSwapModal(false)} className="btn-ghost p-2 text-orbit-text border border-orbit-border"><X className="w-3.5 h-3.5" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>
                      Requested ingredients (comma separated)
                    </label>
                    <input
                      className="orbit-input"
                      value={requestedNames}
                      onChange={(event) => setRequestedNames(event.target.value)}
                      placeholder={selected.nearbyComplementaryIngredients.join(', ')}
                    />
                  </div>

                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>
                      Offered ingredients (optional)
                    </label>
                    <input
                      className="orbit-input"
                      value={offeredNames}
                      onChange={(event) => setOfferedNames(event.target.value)}
                      placeholder={selected.yourIngredients.join(', ')}
                    />
                  </div>

                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>
                      Message
                    </label>
                    <textarea
                      className="orbit-input min-h-[92px]"
                      value={customMessage}
                      onChange={(event) => setCustomMessage(event.target.value)}
                    />
                  </div>

                  <button className="btn-primary w-full" onClick={onSwapSubmit}>
                    Send Swap Request
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}


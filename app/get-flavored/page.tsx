'use client'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useFlavorLibrary, type GeneratedFlavorRecipe } from '@/hooks/useFlavorLibrary'
import { daysUntilExpiry } from '@/lib/utils'
import type { GetFlavoredPreferences, GetFlavoredResponse } from '@/types'
import { ChefHat, Sparkles, Clock, BookOpen, Loader2, WandSparkles, Flame, Salad } from 'lucide-react'

const CUISINE_STYLES = ['Indian', 'Mediterranean', 'Asian fusion', 'Mexican', 'Comfort food']
const FLAVOR_MOODS = ['Spicy and bold', 'Fresh and light', 'Creamy and cozy', 'Sweet-savory mix', 'Tangy and zesty']
const COOK_TIME_PRESETS = [15, 25, 35]

export default function GetFlavoredPage() {
  const { user } = useAuthStore()
  const { items } = useInventory(user?.uid)
  const { saveGeneratedRecipes } = useFlavorLibrary(user?.uid)

  const [preferences, setPreferences] = useState<GetFlavoredPreferences>({
    cuisineStyle: CUISINE_STYLES[0],
    flavorMood: FLAVOR_MOODS[0],
    maxCookTime: 25,
  })
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [recipes, setRecipes] = useState<GeneratedFlavorRecipe[]>([])

  const upcomingExpiring = useMemo(() => {
    return items
      .filter((item) => item.tab === 'kitchen')
      .filter((item) => {
        const expiry = item.adjustedExpiryDate ?? item.expiryDate
        if (!expiry) return false
        const days = daysUntilExpiry(expiry)
        return days >= 0 && days <= 5
      })
      .sort((a, b) => {
        const aDays = daysUntilExpiry(a.adjustedExpiryDate ?? a.expiryDate ?? new Date())
        const bDays = daysUntilExpiry(b.adjustedExpiryDate ?? b.expiryDate ?? new Date())
        return aDays - bDays
      })
  }, [items])

  const generateRecipes = async () => {
    if (loading || upcomingExpiring.length === 0) return
    setLoading(true)
    setRecipes([])
    setSummary('')

    try {
      const res = await fetch('/api/ai/get-flavored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: items, preferences }),
      })

      const data = (await res.json()) as GetFlavoredResponse
      const generated = Array.isArray(data.recipes) ? data.recipes : []
      setRecipes(generated)
      if (generated.length > 0) {
        await saveGeneratedRecipes(generated, preferences)
        setSummary(`${data.summary ?? 'Recipes generated.'} Saved to your Library automatically.`)
      } else {
        setSummary(data.summary ?? '')
      }
    } catch (error) {
      console.error(error)
      setSummary('Generation failed. Please try again.')
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Get Flavored" subtitle="Turn expiring items into quick, fun meals">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl p-6 md:p-7 relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #111827 0%, #7C3AED 35%, #DB2777 72%, #F59E0B 100%)',
            boxShadow: '0 20px 42px rgba(124,58,237,0.35)',
          }}>
          <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent)' }} />
          <div className="absolute -bottom-12 left-16 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.28), transparent)' }} />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <WandSparkles className="w-4 h-4 text-white/90" />
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-white/80">Flavor engine</span>
              </div>
              <h2 className="font-display text-3xl italic text-white">Cook Joyfully, Waste Less</h2>
              <p className="font-sans text-sm text-white/75 mt-1 max-w-xl">Pick your vibe, auto-detect expiring items, and generate high-energy recipes in one click.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Flame className="w-3 h-3" /> {upcomingExpiring.length} expiring soon
              </span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <Salad className="w-3 h-3" /> Zero-waste mode
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card card-lg lg:col-span-2" style={{ background: 'linear-gradient(165deg, rgba(236,72,153,0.08), rgba(124,58,237,0.07) 35%, var(--surface) 80%)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.14)' }}>
                <ChefHat className="w-4 h-4" style={{ color: '#6D28D9' }} />
              </div>
              <div>
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>Get Flavored Preferences</p>
                <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Choose your style and let Orbit do the heavy lifting.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Cuisine style</label>
                <select
                  value={preferences.cuisineStyle}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, cuisineStyle: event.target.value }))}
                  className="orbit-input"
                >
                  {CUISINE_STYLES.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Flavor mood</label>
                <select
                  value={preferences.flavorMood}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, flavorMood: event.target.value }))}
                  className="orbit-input"
                >
                  {FLAVOR_MOODS.map((mood) => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Max cook time</label>
                <div className="grid grid-cols-3 gap-2">
                  {COOK_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPreferences((prev) => ({ ...prev, maxCookTime: preset }))}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={preferences.maxCookTime === preset
                        ? { background: 'linear-gradient(135deg, rgba(79,70,229,0.16), rgba(236,72,153,0.2))', color: '#5B21B6', border: '1.5px solid rgba(124,58,237,0.35)' }
                        : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={generateRecipes}
              disabled={loading || upcomingExpiring.length === 0}
              className="btn-primary mt-4 gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #DB2777)' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating</> : <><Sparkles className="w-4 h-4" /> Generate Recipes</>}
            </button>
          </div>

          <div className="card card-lg" style={{ background: 'linear-gradient(160deg, rgba(14,165,233,0.1), var(--surface) 65%)' }}>
            <p className="section-label mb-2">Auto-detected Expiring</p>
            {upcomingExpiring.length === 0 ? (
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>No kitchen items expiring in the next 5 days.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {upcomingExpiring.map((item) => {
                  const expiry = item.adjustedExpiryDate ?? item.expiryDate
                  const days = expiry ? daysUntilExpiry(expiry) : null
                  return (
                    <div key={item.id} className="p-2.5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(14,165,233,0.22)' }}>
                      <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.productName}</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                        {item.quantity} {item.unit ?? 'units'} · {days === 0 ? 'expires today' : `${days}d left`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {(summary || recipes.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card card-lg"
              style={{ background: 'linear-gradient(175deg, rgba(34,197,94,0.08), rgba(249,115,22,0.08) 44%, var(--surface) 92%)' }}
            >
              {summary && <p className="font-sans text-sm mb-3" style={{ color: 'var(--muted)' }}>{summary}</p>}

              {recipes.length > 0 && (
                <>
                  <div className="grid md:grid-cols-2 gap-3">
                    {recipes.map((recipe, index) => (
                      <motion.div
                        key={recipe.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-2xl border"
                        style={{
                          borderColor: 'rgba(124,58,237,0.25)',
                          background: 'linear-gradient(140deg, rgba(124,58,237,0.09), rgba(236,72,153,0.1) 45%, rgba(255,255,255,0.56))',
                        }}
                      >
                        <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>{recipe.title}</p>
                        <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>{recipe.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="badge badge-muted"><Clock className="w-3 h-3" /> {recipe.cookTimeMinutes}m</span>
                          <span className="badge" style={{ background: 'rgba(124,58,237,0.16)', color: '#6D28D9' }}>{recipe.difficulty}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <a href="/library" className="btn-primary gap-2" style={{ background: 'linear-gradient(135deg, #DB2777, #F97316)' }}>
                      <BookOpen className="w-4 h-4" /> Open Library
                    </a>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

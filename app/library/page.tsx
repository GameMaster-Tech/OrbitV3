'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { getPantryMatch, useFlavorLibrary, useLibraryStats } from '@/hooks/useFlavorLibrary'
import { formatShortDate } from '@/lib/utils'
import { BookOpen, Check, ChefHat, Heart, Search, Star, Trash2, Sparkles } from 'lucide-react'

export default function LibraryPage() {
  const { user } = useAuthStore()
  const { recipes, toggleFavorite, toggleCooked, removeRecipe } = useFlavorLibrary(user?.uid)
  const { items } = useInventory(user?.uid)
  const [query, setQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const stats = useLibraryStats(recipes)

  const filtered = useMemo(() => {
    return recipes
      .filter((recipe) => {
        if (showFavoritesOnly && !recipe.favorite) return false
        if (!query.trim()) return true
        const q = query.toLowerCase()
        return (
          recipe.title.toLowerCase().includes(q) ||
          recipe.description.toLowerCase().includes(q) ||
          recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(q))
        )
      })
  }, [recipes, query, showFavoritesOnly])

  return (
    <AppShell title="Recipe Library" subtitle="Your saved Get Flavored recipes">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #1F2937 0%, #2563EB 32%, #14B8A6 66%, #F59E0B 100%)',
            boxShadow: '0 18px 42px rgba(37,99,235,0.3)',
          }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.24), transparent)' }} />
          <div className="absolute -bottom-12 left-10 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.26), transparent)' }} />
          <div className="relative z-10 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-white/90" />
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-white/80">Flavor vault</span>
              </div>
              <h2 className="font-display text-3xl italic text-white">Your Recipe Universe</h2>
              <p className="font-sans text-sm mt-1 text-white/75">Detailed, reusable cards with pantry match intelligence built in.</p>
            </div>
            <a href="/get-flavored" className="btn-primary gap-1.5" style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)' }}>
              <ChefHat className="w-3.5 h-3.5" /> Generate More
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div className="card card-md" style={{ background: 'linear-gradient(170deg, rgba(59,130,246,0.12), var(--surface) 70%)' }}>
            <p className="section-label">Total recipes</p>
            <p className="stat-value">{stats.total}</p>
          </div>
          <div className="card card-md" style={{ background: 'linear-gradient(170deg, rgba(244,63,94,0.12), var(--surface) 70%)' }}>
            <p className="section-label">Favorites</p>
            <p className="stat-value">{stats.favorites}</p>
          </div>
          <div className="card card-md" style={{ background: 'linear-gradient(170deg, rgba(16,185,129,0.12), var(--surface) 70%)' }}>
            <p className="section-label">Cooked</p>
            <p className="stat-value">{stats.cooked}</p>
          </div>
          <div className="card card-md" style={{ background: 'linear-gradient(170deg, rgba(245,158,11,0.13), var(--surface) 70%)' }}>
            <p className="section-label">Standout</p>
            <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>Pantry match score on every card</p>
          </div>
        </div>

        <div className="card card-md" style={{ background: 'linear-gradient(160deg, rgba(124,58,237,0.09), var(--surface) 72%)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--dim)' }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search recipes or ingredients"
                className="orbit-input pl-9"
              />
            </div>
            <button
              onClick={() => setShowFavoritesOnly((value) => !value)}
              className="btn-ghost gap-1.5"
            >
              <Star className="w-3.5 h-3.5" />
              {showFavoritesOnly ? 'Show All' : 'Favorites Only'}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card card-lg text-center py-14" style={{ background: 'linear-gradient(165deg, rgba(99,102,241,0.08), var(--surface) 70%)' }}>
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-orbit-dim" />
            <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>No recipes yet</p>
            <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>Generate recipes from Get Flavored and they will appear here.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filtered.map((recipe, index) => {
              const { matchScore, missingIngredients } = getPantryMatch(recipe, items)
              return (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="card card-lg"
                  style={{
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(59,130,246,0.08) 42%, rgba(244,63,94,0.08) 100%)',
                    borderColor: 'rgba(99,102,241,0.22)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>{recipe.title}</p>
                      <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>{recipe.description}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(recipe.id, !recipe.favorite)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: recipe.favorite ? 'rgba(244,63,94,0.16)' : 'rgba(255,255,255,0.65)', color: recipe.favorite ? '#E11D48' : 'var(--dim)' }}
                      title="Toggle favorite"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="badge badge-muted">{recipe.cookTimeMinutes} min</span>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#4F46E5' }}>{recipe.difficulty}</span>
                    <span className="badge" style={{ background: 'rgba(16,185,129,0.14)', color: '#047857' }}>Serves {recipe.servings}</span>
                    <span className="badge" style={{ background: 'rgba(245,158,11,0.16)', color: '#B45309' }}>Pantry match {matchScore}%</span>
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="section-label mb-1">Ingredients</p>
                      <ul className="space-y-1">
                        {recipe.ingredients.map((ingredient, i) => (
                          <li key={i} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>• {ingredient}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="section-label mb-1">Steps</p>
                      <ol className="space-y-1">
                        {recipe.steps.map((step, i) => (
                          <li key={i} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{i + 1}. {step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <p className="font-sans text-xs font-semibold" style={{ color: '#4F46E5' }}>Fun tip</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{recipe.funTip}</p>
                  </div>

                  {missingIngredients.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl" style={{ background: 'rgba(217,119,6,0.1)' }}>
                      <p className="font-sans text-xs font-semibold" style={{ color: '#B45309' }}>Missing ingredients</p>
                      <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{missingIngredients.join(', ')}</p>
                    </div>
                  )}

                  <p className="font-sans text-[11px] mt-3" style={{ color: 'var(--dim)' }}>
                    Generated {formatShortDate(recipe.generatedAt)} · Expiring items used: {recipe.expiringItemsUsed.join(', ') || 'n/a'}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => toggleCooked(recipe.id, !recipe.cooked)} className="btn-ghost gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {recipe.cooked ? 'Cooked' : 'Mark cooked'}
                    </button>
                    <button onClick={() => removeRecipe(recipe.id)} className="btn-ghost gap-1.5" style={{ color: '#DC2626' }}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

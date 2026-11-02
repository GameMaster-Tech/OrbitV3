'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Play, RefreshCw, Sparkles } from 'lucide-react'
import { createOrbitDemoState, daysUntilDemoExpiry, orbitDemoSteps, type OrbitDemoState } from '@/lib/demoData'

type Recipe = { name: string; description: string; cookTime: string; ingredients: string[]; steps: string[] }

function Button({ children, onClick, primary = false, disabled = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className={primary ? 'btn-primary text-xs px-3 py-2' : 'btn-ghost text-xs px-3 py-2'}>{children}</button>
}

export default function DemoPage() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<OrbitDemoState>(createOrbitDemoState)
  const [tryMode, setTryMode] = useState(false)
  const [message, setMessage] = useState('Choose SHOW ME for the guided scenario, or LET ME TRY to interact with the prepared Orbit data.')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [recipeSource, setRecipeSource] = useState<'live' | 'fallback' | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const current = orbitDemoSteps[step]
  const urgent = useMemo(() => state.inventory.filter((item) => daysUntilDemoExpiry(item.expiryDate) <= 2), [state.inventory])

  const reset = () => {
    setState(createOrbitDemoState())
    setStep(0); setTryMode(false); setRecipe(null); setRecipeSource(null)
    setMessage('Demo reset. All sample household data and actions are back to their initial state.')
  }
  const navigate = (direction: -1 | 1) => { setStep((value) => Math.max(0, Math.min(orbitDemoSteps.length - 1, value + direction))); setTryMode(false) }
  const generateRecipe = async () => {
    setLoadingRecipe(true); setRecipe(null); setRecipeSource(null)
    try {
      const response = await fetch('/api/ai/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventory: state.inventory }) })
      const data = await response.json()
      setRecipe(data.recipes?.[0] ?? null)
      setRecipeSource(data.source === 'live' ? 'live' : 'fallback')
      setState((value) => ({ ...value, recipeSaved: Boolean(data.recipes?.[0]) }))
      setMessage(data.source === 'live' ? 'Live Gemini recipe generated from the seeded expiry queue.' : 'Live AI was unavailable, so Orbit returned its clearly marked deterministic recipe fallback.')
    } catch {
      setRecipeSource('fallback')
      setMessage('The AI route could not be reached. Configure GEMINI_API_KEY to use live recipe generation.')
    } finally { setLoadingRecipe(false) }
  }
  const show = () => {
    if (step === 0) setMessage('The dashboard has 6 household items, 4 priority expiry signals, an over-budget grocery category, and one warranty action.')
    if (step === 1) setMessage('Prepared pantry scan: spinach, tomatoes, milk, and pasta were identified. This seeded result is deterministic; use Inventory to scan a real image with live AI.')
    if (step === 2) setMessage('Orbit prioritised spinach for today, tomatoes for tomorrow, and milk for the next breakfast plan.')
    if (step === 3) void generateRecipe()
    if (step === 4) { setState((value) => ({ ...value, sharedUpdate: true })); setMessage('A household member recorded two pasta packs. The shared-state indicator is updated and will remain until reset.') }
    if (step === 5) { setState((value) => ({ ...value, marketplaceInterest: true })); setMessage('Interest was registered for a nearby yogurt rescue listing. This is a contained demo action, not a live marketplace message.') }
    if (step === 6) { setState((value) => ({ ...value, serviceRequestOpen: true })); setMessage('Service request SR-DEMO-017 created for the air purifier; its invoice and warranty status are now linked in demo state.') }
    if (step === 7) setMessage('Recommendation: cook the spinach-tomato meal today, share surplus yogurt, and schedule the air purifier’s filter service before warranty expiry.')
  }

  return <main className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg)' }}><div className="max-w-6xl mx-auto space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="btn-ghost text-xs px-3 py-2"><ArrowLeft className="w-3.5 h-3.5" /> Back to Orbit</Link><div className="text-right"><p className="section-label">Interactive walkthrough</p><h1 className="font-display text-3xl font-bold italic">Explore Orbit Demo</h1></div><Button onClick={reset}><RefreshCw className="w-3.5 h-3.5" /> Reset demo</Button></header>
    <section className="card card-lg" style={{ borderColor: 'rgba(99,102,241,.35)' }}><div className="flex flex-wrap justify-between gap-4 items-start"><div><p className="section-label text-orbit-primary">Orbit household intelligence</p><h2 className="font-sans text-xl font-semibold mt-1">{current[0]}</h2><p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{current[1]}</p></div><div className="text-right"><p className="text-xs font-semibold">Step {step + 1} of {orbitDemoSteps.length}</p><div className="flex gap-1 mt-2">{orbitDemoSteps.map((_, index) => <span key={index} className="h-1.5 w-5 rounded-full" style={{ background: index <= step ? 'var(--primary)' : 'var(--border)' }} />)}</div></div></div><div className="flex gap-2 mt-5"><Button primary onClick={show}><Play className="w-3.5 h-3.5" /> Show me</Button><Button onClick={() => { setTryMode(true); setMessage('Hands-on mode is active. Use the scenario controls below with the same prepared household data.'); }}>Let me try</Button></div></section>
    <p role="status" className="card card-sm text-sm"><Sparkles className="inline w-4 h-4 mr-2 text-orbit-primary" />{message}</p>
    <section className="grid lg:grid-cols-[1.25fr_.75fr] gap-5"><div className="card card-lg"><Scenario step={step} urgent={urgent} recipe={recipe} recipeSource={recipeSource} loadingRecipe={loadingRecipe} tryMode={tryMode} onShow={show} /></div><aside className="card card-lg"><p className="section-label mb-3">Persistent demo state</p><div className="space-y-3 text-sm"><p><b>{state.inventory.length}</b> household items · <b>{urgent.length}</b> require attention</p><p><b>₹8,450</b> grocery budget · <b>₹7,150</b> used</p><p><b>1</b> warranty issue · <b>2</b> shared household members</p><div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>{state.recipeSaved && <p>✓ Recipe saved from AI route</p>}{state.sharedUpdate && <p>✓ Shared pantry updated</p>}{state.marketplaceInterest && <p>✓ SwapSync interest registered</p>}{state.serviceRequestOpen && <p>✓ Service request open</p>}{!state.recipeSaved && !state.sharedUpdate && !state.marketplaceInterest && !state.serviceRequestOpen && <p style={{ color: 'var(--muted)' }}>Demo actions remain visible here until reset.</p>}</div></div></aside></section>
    <footer className="flex justify-between"><Button disabled={step === 0} onClick={() => navigate(-1)}><ArrowLeft className="w-3.5 h-3.5" /> Previous</Button><Button primary disabled={step === orbitDemoSteps.length - 1} onClick={() => navigate(1)}>Next <ArrowRight className="w-3.5 h-3.5" /></Button></footer>
  </div></main>
}

function Scenario({ step, urgent, recipe, recipeSource, loadingRecipe, tryMode, onShow }: { step: number; urgent: OrbitDemoState['inventory']; recipe: Recipe | null; recipeSource: 'live' | 'fallback' | null; loadingRecipe: boolean; tryMode: boolean; onShow: () => void }) {
  if (step === 0) return <><p className="font-semibold">Household command centre</p><div className="grid sm:grid-cols-3 gap-3 mt-4">{[['Expiry alerts', `${urgent.length} items`], ['Budget status', '84% used'], ['Warranty', 'Air purifier']].map(([label, value]) => <div className="p-3 rounded-xl" key={label} style={{ background: 'var(--elevated)' }}><p className="text-xs">{label}</p><b>{value}</b></div>)}</div></>
  if (step === 1) return <><div className="rounded-2xl min-h-40 p-5 flex items-end" style={{ background: 'linear-gradient(145deg,#7d9c62,#e6c69b)' }}><span className="badge bg-white/85 text-black">Prepared pantry image</span></div><p className="text-sm mt-3">Recognised products: spinach, tomatoes, milk, and pasta. Real image uploads in Orbit use the live vision route; this prepared result keeps the demo reliable.</p>{tryMode && <Button primary onClick={onShow}>Review recognition</Button>}</>
  if (step === 2) return <>{urgent.map((item) => <div className="p-3 mb-2 rounded-xl flex justify-between" key={item.id} style={{ background: daysUntilDemoExpiry(item.expiryDate) <= 0 ? 'rgba(244,63,94,.11)' : 'rgba(245,158,11,.12)' }}><span>{item.productName}</span><b>{daysUntilDemoExpiry(item.expiryDate) < 0 ? 'Expired' : daysUntilDemoExpiry(item.expiryDate) === 0 ? 'Today' : `${daysUntilDemoExpiry(item.expiryDate)}d`}</b></div>)}</>
  if (step === 3) return <><p className="font-semibold">Zero-waste recipe generation</p><p className="text-sm mt-1">The recipe request sends the seeded household inventory to `/api/ai/recipes`.</p>{tryMode && <Button primary onClick={onShow}>{loadingRecipe ? 'Generating…' : 'Generate recipe'}</Button>}{recipe && <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--elevated)' }}><p className="badge mb-2" style={{ background: recipeSource === 'live' ? 'rgba(5,150,105,.15)' : 'rgba(245,158,11,.16)' }}>{recipeSource === 'live' ? 'Live Gemini result' : 'Deterministic fallback'}</p><h3 className="font-semibold">{recipe.name}</h3><p className="text-sm">{recipe.description} · {recipe.cookTime}</p></div>}</>
  if (step === 4) return <><p className="font-semibold">Kavya added 2 packs of pasta</p><p className="text-sm">The prepared household uses the same pantry data across expiry, recipes, and recommendations.</p>{tryMode && <Button primary onClick={onShow}>Confirm household update</Button>}</>
  if (step === 5) return <><p className="font-semibold">Nearby rescue listing</p><p className="text-sm">Priya · Greek yogurt, 2 tubs · expires tomorrow · 4.7 km away</p>{tryMode && <Button primary onClick={onShow}>Express interest</Button>}</>
  if (step === 6) return <><p className="font-semibold">Air purifier warranty</p><p className="text-sm">Invoice INV-2025-431 · warranty active for 104 days · filter service due.</p>{tryMode && <Button primary onClick={onShow}>Create service request</Button>}</>
  return <ul className="list-disc pl-5 text-sm space-y-3"><li>Cook spinach and tomatoes today with the recipe engine.</li><li>Share or review the expired yogurt to reduce waste.</li><li>Plan air purifier service while the warranty remains active.</li></ul>
}

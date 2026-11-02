'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, ShoppingCart, X, MapPin, Coins, RefreshCw, Tag, CheckCircle, Users, Sparkles, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { useWallet } from '@/hooks/useWallet'
import { listenSwapOffers, createSwapOffer, executeSwapTransaction, cancelSwapOffer } from '@/lib/firestore'
import { formatCredits, daysUntilExpiry, formatShortDate } from '@/lib/utils'
import type { SwapOffer } from '@/types'

const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

export default function SwapSyncPage() {
  const { user, profile } = useAuthStore()
  const { items } = useInventory(user?.uid)
  const { wallet } = useWallet(user?.uid)
  const [offers, setOffers] = useState<SwapOffer[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedItem, setSelectedItem] = useState('')
  const [creditPrice, setCreditPrice] = useState('5')
  const [description, setDescription] = useState('')
  const [buying, setBuying] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community')

  useEffect(() => {
    if (!profile?.location?.city || !profile?.location?.state) return
    const unsub = listenSwapOffers(profile.location.city, profile.location.state, setOffers)
    return () => unsub()
  }, [profile])

  if (!user || !profile) return null

  const myOffers = offers.filter(o => o.sellerId === user.uid)
  const communityOffers = offers.filter(o => o.sellerId !== user.uid)
  const selectedItemData = items.find(i => i.id === selectedItem)

  const handleCreate = async () => {
    const item = items.find(i => i.id === selectedItem)
    if (!item || !profile.location?.city) return
    await createSwapOffer({
      itemId: item.id, sellerId: user.uid, sellerName: profile.displayName,
      sellerCity: profile.location.city, sellerState: profile.location.state,
      productName: item.productName, category: item.category, quantity: item.quantity,
      creditPrice: parseInt(creditPrice) || 5, expiryDate: item.expiryDate,
      description, communityCity: profile.location.city, communityState: profile.location.state, status: 'active',
    })
    setShowCreate(false); setSelectedItem(''); setCreditPrice('5'); setDescription('')
  }

  const handleBuy = async (offer: SwapOffer) => {
    if (!wallet || wallet.balance < offer.creditPrice) return
    setBuying(offer.id)
    try { await executeSwapTransaction(offer, user.uid) }
    catch (err) { console.error('Swap failed', err) }
    finally { setBuying(null) }
  }

  return (
    <AppShell title="SwapSync" subtitle={`${profile.location?.city ?? 'Unknown'}, ${profile.location?.state ?? ''}`}>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">

        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #164E63 100%)', boxShadow: '0 8px 32px rgba(8,145,178,0.3)' }}>
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.8)' }} />
                  <span className="font-sans text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Community Marketplace</span>
                </div>
                <h2 className="font-display text-3xl font-bold italic text-white mb-1">Swap. Save. Sustain.</h2>
                <p className="font-sans text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>List expiring items, earn credits, reduce waste</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{profile.location?.city}, {profile.location?.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{communityOffers.length} offers nearby</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Coins className="w-4 h-4 text-white" />
                  <span className="font-sans text-base font-bold text-white">{formatCredits(wallet?.balance ?? 0)}</span>
                </div>
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm font-semibold"
                  style={{ background: 'white', color: '#0891B2' }}>
                  <Plus className="w-4 h-4" /> List an Item
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--elevated)' }}>
          {([
            { key: 'community' as const, label: 'Community Offers', count: communityOffers.length },
            { key: 'mine' as const, label: 'My Listings', count: myOffers.length },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.key
                ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 4px rgba(15,17,23,0.08)' }
                : { color: 'var(--muted)' }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: activeTab === tab.key ? 'rgba(8,145,178,0.12)' : 'var(--border)', color: activeTab === tab.key ? '#0891B2' : 'var(--dim)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'community' ? (
            <motion.div key="community" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {communityOffers.length === 0 ? (
                <div className="card card-lg text-center py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(8,145,178,0.1)' }}>
                    <Sparkles className="w-8 h-8" style={{ color: '#0891B2' }} />
                  </div>
                  <p className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>No offers nearby yet</p>
                  <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>Be the first to list something in your community</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5 mt-4 mx-auto"><Plus className="w-3.5 h-3.5" /> List an Item</button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {communityOffers.map((offer, i) => {
                    const canAfford = (wallet?.balance ?? 0) >= offer.creditPrice
                    const expDays = offer.expiryDate ? daysUntilExpiry(offer.expiryDate) : null
                    return (
                      <motion.div key={offer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="card card-md hover:-translate-y-0.5 transition-transform">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{offer.productName}</p>
                            <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>by {offer.sellerName}</p>
                          </div>
                          <div className="shrink-0 px-2.5 py-1 rounded-xl font-sans text-sm font-bold" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891B2' }}>
                            {formatCredits(offer.creditPrice)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span className="badge badge-muted">{offer.category}</span>
                          <span className="font-sans text-xs" style={{ color: 'var(--dim)' }}>x{offer.quantity}</span>
                          {expDays !== null && (
                            <span className="badge text-[10px]" style={{ color: expDays <= 3 ? '#D97706' : '#059669', background: expDays <= 3 ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.1)' }}>
                              {expDays <= 0 ? 'Expires today' : `${expDays}d left`}
                            </span>
                          )}
                        </div>
                        {offer.description && <p className="font-sans text-xs mb-3" style={{ color: 'var(--muted)' }}>{offer.description}</p>}
                        <button onClick={() => handleBuy(offer)} disabled={buying === offer.id || !canAfford}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: canAfford ? 'rgba(8,145,178,0.12)' : 'var(--elevated)', color: canAfford ? '#0891B2' : 'var(--dim)', border: `1.5px solid ${canAfford ? 'rgba(8,145,178,0.3)' : 'var(--border)'}` }}>
                          {buying === offer.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> {canAfford ? 'Buy Now' : 'Insufficient Credits'}</>}
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="mine" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {myOffers.length === 0 ? (
                <div className="card card-lg text-center py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <Tag className="w-8 h-8" style={{ color: '#6366F1' }} />
                  </div>
                  <p className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>No active listings</p>
                  <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>List expiring items to earn credits</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5 mt-4 mx-auto"><Plus className="w-3.5 h-3.5" /> List an Item</button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {myOffers.map((offer, i) => (
                    <motion.div key={offer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="card card-md hover:-translate-y-0.5 transition-transform">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{offer.productName}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="badge badge-muted">{offer.category}</span>
                            <span className="font-sans text-xs" style={{ color: 'var(--dim)' }}>x{offer.quantity}</span>
                          </div>
                        </div>
                        <div className="shrink-0 px-2.5 py-1 rounded-xl font-sans text-sm font-bold" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
                          {formatCredits(offer.creditPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5 flex-1">
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                          <span className="font-sans text-xs font-medium" style={{ color: '#059669' }}>Active listing</span>
                        </div>
                        <button onClick={() => {
                          if (!profile.location?.city || !profile.location?.state) return
                          cancelSwapOffer(profile.location.city, profile.location.state, offer.id)
                        }} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="card card-lg w-full max-w-sm" style={{ boxShadow: '0 24px 64px rgba(15,17,23,0.2)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>List an Item</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Earn credits by sharing with your community</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--dim)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Select item from inventory</label>
                  <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="orbit-input">
                    <option value="">Choose an item...</option>
                    {items.filter(i => i.tab === 'kitchen').map(i => {
                      const exp = i.adjustedExpiryDate ?? i.expiryDate
                      const days = exp ? daysUntilExpiry(exp) : null
                      return <option key={i.id} value={i.id}>{i.productName} x{i.quantity}{days !== null ? ` - ${days}d left` : ''}</option>
                    })}
                  </select>
                </div>
                {selectedItemData && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.2)' }}>
                    <p className="font-sans text-sm font-semibold" style={{ color: '#0891B2' }}>{selectedItemData.productName}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {selectedItemData.category} x{selectedItemData.quantity}
                      {selectedItemData.expiryDate && ` - Expires ${formatShortDate(selectedItemData.expiryDate)}`}
                    </p>
                  </motion.div>
                )}
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                    <Coins className="w-3 h-3" /> Credit price
                  </label>
                  <input value={creditPrice} onChange={e => setCreditPrice(e.target.value)} type="number" min="1" placeholder="5" className="orbit-input" />
                  <p className="font-sans text-[10px] mt-1" style={{ color: 'var(--dim)' }}>Suggested: 5-20 credits</p>
                </div>
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Description (optional)</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes for the buyer..." className="orbit-input" />
                </div>
                <button onClick={handleCreate} disabled={!selectedItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 text-white"
                  style={{ background: 'linear-gradient(135deg, #0891B2, #0E7490)', boxShadow: '0 4px 16px rgba(8,145,178,0.35)' }}>
                  <RefreshCw className="w-4 h-4" /> List on SwapSync <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}


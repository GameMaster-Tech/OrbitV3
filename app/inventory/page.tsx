﻿'use client'
import { Suspense, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import {
  Plus, Camera, X, ThumbsDown, Trash2, Search,
  Package, Cpu, Zap, FileText, Barcode, ScanLine,
  DollarSign, Calendar, Tag, MapPin, ChevronRight,
  Shield, Hash, Building2, Star,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/hooks/useInventory'
import { cn, daysUntilExpiry, formatShortDate, toBase64 } from '@/lib/utils'
import { getRecommendedZone } from '@/lib/zoneService'
import type { InventoryItem, InventoryTab } from '@/types'

const CATS = [
  { key: 'kitchen'     as InventoryTab, label: 'Kitchen & Groceries', icon: Package,  color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)'  },
  { key: 'electronics' as InventoryTab, label: 'Electronics',          icon: Cpu,      color: '#0891B2', bg: 'rgba(8,145,178,0.1)',   border: 'rgba(8,145,178,0.3)'   },
  { key: 'appliances'  as InventoryTab, label: 'Appliances',           icon: Zap,      color: '#D97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.3)'   },
  { key: 'documents'   as InventoryTab, label: 'Documents',            icon: FileText, color: '#059669', bg: 'rgba(5,150,105,0.1)',   border: 'rgba(5,150,105,0.3)'   },
]

const KITCHEN_CATS = ['dairy','meat','seafood','produce','frozen','pantry','grains','snacks','bread','beverages','other']
const ELECTRONICS_CATS = ['smartphone','laptop','tablet','tv','camera','audio','gaming','wearable','accessory','other']
const APPLIANCES_CATS = ['refrigerator','washing machine','dryer','dishwasher','microwave','oven','vacuum','air conditioner','other']
const DOCUMENT_CATS = ['Driving License','Passport','Aadhaar Card','PAN Card','Voter ID','Birth Certificate','Marriage Certificate','Property Deed','Vehicle Registration','Health Insurance','Life Insurance','Home Insurance','Vehicle Insurance','Lease Agreement','Employment Contract','Bank Statement','Tax Return','Utility Bill','Medical Record','Educational Certificate','Other']
const CONDITIONS = ['new','good','fair','poor'] as const
const INVENTORY_TABS: InventoryTab[] = ['kitchen', 'electronics', 'appliances', 'documents']

type EntryMethod = 'manual' | 'barcode' | 'image'
const fadeUp: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

function isInventoryTab(value: string | null): value is InventoryTab {
  return Boolean(value && INVENTORY_TABS.includes(value as InventoryTab))
}

function useItemForm() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [zone, setZone] = useState('')
  const [barcode, setBarcode] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [condition, setCondition] = useState<'new'|'good'|'fair'|'poor'>('good')
  const [notes, setNotes] = useState('')
  const [documentDataUrl, setDocumentDataUrl] = useState('')
  const [documentMimeType, setDocumentMimeType] = useState('')
  const [documentFileName, setDocumentFileName] = useState('')
  const reset = () => {
    setName(''); setCategory('other'); setQuantity('1'); setPrice('')
    setPurchaseDate(''); setExpiryDate(''); setWarrantyExpiry(''); setZone('')
    setBarcode(''); setBrand(''); setModel(''); setSerialNumber('')
    setCondition('good'); setNotes('')
    setDocumentDataUrl(''); setDocumentMimeType(''); setDocumentFileName('')
  }
  return { name, setName, category, setCategory, quantity, setQuantity, price, setPrice,
    purchaseDate, setPurchaseDate, expiryDate, setExpiryDate, warrantyExpiry, setWarrantyExpiry,
    zone, setZone, barcode, setBarcode, brand, setBrand, model, setModel,
    serialNumber, setSerialNumber, condition, setCondition, notes, setNotes,
    documentDataUrl, setDocumentDataUrl, documentMimeType, setDocumentMimeType,
    documentFileName, setDocumentFileName, reset }
}

const conditionStyle = (c?: string) => {
  if (c === 'new')  return { color: '#059669', bg: 'rgba(5,150,105,0.12)' }
  if (c === 'good') return { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' }
  if (c === 'fair') return { color: '#D97706', bg: 'rgba(217,119,6,0.12)' }
  return { color: '#DC2626', bg: 'rgba(220,38,38,0.12)' }
}

function InventoryPageContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const { user } = useAuthStore()
  const { items, zones, loading, addItem, removeItem, applyThumbsDown, getItemsByTab } = useInventory(user?.uid)
  const [activeTab, setActiveTab] = useState<InventoryTab>('kitchen')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('manual')
  const [searchQuery, setSearchQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanPickerMode, setScanPickerMode] = useState<'product' | 'barcode' | null>(null)
  const [cameraMode, setCameraMode] = useState<'product' | 'barcode' | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const form = useItemForm()
  const imageRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const documentRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const tabItems = getItemsByTab(activeTab).filter(i =>
    searchQuery ? i.productName.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  const activeCat = CATS.find(c => c.key === activeTab)!
  const isDeviceTab = activeTab === 'electronics' || activeTab === 'appliances'

  const catOptions = activeTab === 'kitchen' ? KITCHEN_CATS
    : activeTab === 'electronics' ? ELECTRONICS_CATS
    : activeTab === 'appliances' ? APPLIANCES_CATS
    : DOCUMENT_CATS

  useEffect(() => {
    if (isInventoryTab(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const openAdd = (method: EntryMethod = 'manual') => {
    form.reset()
    if (activeTab === 'electronics') form.setCategory('smartphone')
    if (activeTab === 'appliances') form.setCategory('refrigerator')
    if (activeTab === 'documents') form.setCategory('Other')
    setEntryMethod(method)
    setShowAdd(true)
  }

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())
    mediaStreamRef.current = null
  }

  useEffect(() => {
    if (!cameraOpen) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.')
      return
    }

    let active = true
    setCameraError(null)

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    }).then(stream => {
      if (!active) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    }).catch(() => {
      setCameraError('Unable to access camera. Check browser permissions and try again.')
    })

    return () => {
      active = false
      stopCamera()
    }
  }, [cameraOpen])

  const openScanPicker = (mode: 'product' | 'barcode') => {
    setScanPickerMode(mode)
  }

  const chooseUpload = () => {
    if (!scanPickerMode) return
    if (scanPickerMode === 'barcode') barcodeRef.current?.click()
    else imageRef.current?.click()
    setScanPickerMode(null)
  }

  const chooseCamera = () => {
    if (!scanPickerMode) return
    setCameraMode(scanPickerMode)
    setScanPickerMode(null)
    setCameraOpen(true)
  }

  const closeCamera = () => {
    setCameraOpen(false)
    setCameraMode(null)
    setCameraError(null)
    stopCamera()
  }

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraMode) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video.videoWidth || !video.videoHeight) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    if (!blob) return
    const file = new File([blob], `${cameraMode}-capture.jpg`, { type: 'image/jpeg' })

    closeCamera()
    if (cameraMode === 'barcode') await handleBarcodeScan(file)
    else await handleImageScan(file)
  }

  const handleImageScan = async (file: File) => {
    setScanning(true)
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/ai/vision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, mode: 'product' }),
      })
      const data = await res.json()
      if (data.productName) { form.setName(data.productName); form.setCategory(data.category || 'other'); setShowAdd(true) }
    } catch (err) { console.error(err) } finally { setScanning(false) }
  }

  const handleBarcodeScan = async (file: File) => {
    setBarcodeScanning(true)
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/ai/vision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, mode: 'barcode' }),
      })
      const data = await res.json()
      if (data.productName) { form.setName(data.productName); if (data.barcode) form.setBarcode(data.barcode) }
      setShowAdd(true)
    } catch (err) { console.error(err) } finally { setBarcodeScanning(false) }
  }

  const handleDocumentUpload = async (file: File) => {
    if (!file) return
    const base64 = await toBase64(file)
    form.setDocumentDataUrl(`data:${file.type || 'application/octet-stream'};base64,${base64}`)
    form.setDocumentMimeType(file.type || 'application/octet-stream')
    form.setDocumentFileName(file.name || 'document')
  }

  const handleSave = async () => {
      if (!form.name.trim()) return
      setSaving(true)
      try {
        const resolvedZone = activeTab === 'kitchen'
          ? (zones.find(z => z.id === form.zone) || zones.find(z => z.name === getRecommendedZone(form.category)))
          : undefined

        // For kitchen items, fetch Orbit's AI predicted expiry
        let orbitPredictedExpiry: Date | undefined
        let orbitPredictedConfidence: 'high' | 'medium' | 'low' | undefined
        let orbitPredictedReason: string | undefined

        if (activeTab === 'kitchen') {
          try {
            const predRes = await fetch('/api/ai/predict-expiry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productName: form.name.trim(),
                category: form.category,
                quantity: parseInt(form.quantity) || 1,
                purchaseDate: form.purchaseDate || undefined,
                originalExpiryDate: form.expiryDate || undefined,
                zoneConditions: resolvedZone
                  ? `${resolvedZone.temperature}, ${resolvedZone.humidity} humidity`
                  : 'standard room temperature',
              }),
            })
            if (predRes.ok) {
              const pred = await predRes.json()
              if (pred.predictedExpiryDate) {
                orbitPredictedExpiry = new Date(pred.predictedExpiryDate)
                orbitPredictedConfidence = pred.confidence
                orbitPredictedReason = pred.reasoning
              }
            }
          } catch {
            // non-fatal — item still saves without prediction
          }
        }

        await addItem({
          productName: form.name.trim(), category: form.category, tab: activeTab,
          quantity: parseInt(form.quantity) || 1,
          price: form.price ? parseFloat(form.price) : undefined,
          purchaseDate: form.purchaseDate ? new Date(form.purchaseDate) : undefined,
          expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
          warrantyExpiry: form.warrantyExpiry ? new Date(form.warrantyExpiry) : undefined,
          zoneId: resolvedZone?.id,
          barcode: form.barcode || undefined,
          brand: form.brand || undefined,
          model: form.model || undefined,
          serialNumber: form.serialNumber || undefined,
          condition: isDeviceTab ? form.condition : undefined,
          notes: form.notes || undefined,
          documentDataUrl: activeTab === 'documents' ? (form.documentDataUrl || undefined) : undefined,
          documentMimeType: activeTab === 'documents' ? (form.documentMimeType || undefined) : undefined,
          documentFileName: activeTab === 'documents' ? (form.documentFileName || undefined) : undefined,
          orbitPredictedExpiry,
          orbitPredictedConfidence,
          orbitPredictedReason,
          addedAt: new Date(),
        })
        form.reset(); setShowAdd(false)
      } finally { setSaving(false) }
    }

  const totalValue = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
  const atRiskValue = items
    .filter(i => { const exp = i.adjustedExpiryDate ?? i.expiryDate; return exp && daysUntilExpiry(exp) <= 3 && daysUntilExpiry(exp) >= 0 })
    .reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)

  const warrantyDays = (item: InventoryItem) => (item.warrantyExpiry ? daysUntilExpiry(item.warrantyExpiry) : null)

  return (
    <AppShell title="Inventory" subtitle={`${items.length} items · ₹${totalValue.toFixed(0)} total value`}>
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-5 max-w-5xl mx-auto">

        {/* Category cards */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <p className="section-label mb-3">Categories</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATS.map(cat => {
              const Icon = cat.icon
              const count = getItemsByTab(cat.key).length
              const isActive = activeTab === cat.key
              const catValue = getItemsByTab(cat.key).reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
              return (
                <button key={cat.key} onClick={() => setActiveTab(cat.key)} className="card card-md text-left transition-all"
                  style={isActive ? { background: cat.bg, borderColor: cat.border } : {}}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cat.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />}
                  </div>
                  <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>{cat.label}</p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{count} item{count !== 1 ? 's' : ''}</p>
                  {catValue > 0 && <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--dim)' }}>₹{catValue.toFixed(0)} value</p>}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* At-risk banner */}
        {atRiskValue > 0 && activeTab === 'kitchen' && (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <div className="card card-sm flex items-center gap-3"
              style={{ background: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.3)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,6,0.15)' }}>
                <DollarSign className="w-4 h-4" style={{ color: '#D97706' }} />
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>₹{atRiskValue.toFixed(2)} at risk of expiring</p>
                <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Items expiring within 3 days</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Items panel */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <div className="card card-lg">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: activeCat.bg }}>
                <activeCat.icon className="w-4 h-4" style={{ color: activeCat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>{activeCat.label}</p>
                <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{tabItems.length} items</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--dim)' }} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="orbit-input pl-9 w-36 text-sm" />
                </div>
                <button onClick={() => openScanPicker('barcode')} className="btn-ghost gap-1.5 text-sm" disabled={barcodeScanning || activeTab === 'documents'} style={activeTab === 'documents' ? { display: 'none' } : {}}>
                  <Barcode className="w-3.5 h-3.5" /> {barcodeScanning ? 'Reading...' : 'Barcode'}
                </button>
                <button onClick={() => openScanPicker('product')} className="btn-ghost gap-1.5 text-sm" disabled={scanning}>
                  <ScanLine className="w-3.5 h-3.5" /> {scanning ? 'Scanning...' : 'Scan'}
                </button>
                <button onClick={() => openAdd('manual')} className="btn-primary gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add {isDeviceTab ? 'Device' : 'Item'}
                </button>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageScan(e.target.files[0])} />
                <input ref={barcodeRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleBarcodeScan(e.target.files[0])} />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28" />)}
              </div>
            ) : tabItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: activeCat.bg }}>
                  <activeCat.icon className="w-7 h-7" style={{ color: activeCat.color }} />
                </div>
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text)' }}>No items yet</p>
                <p className="font-sans text-xs mt-1 mb-5" style={{ color: 'var(--muted)' }}>
                  {isDeviceTab ? 'Track devices, warranties, and purchase details' : 'Add items manually or scan a product'}
                </p>
                <button onClick={() => openAdd('manual')} className="btn-primary gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add {isDeviceTab ? 'Device' : 'Item'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {tabItems.map(item => {
                    const exp = item.adjustedExpiryDate ?? item.expiryDate
                    const days = exp ? daysUntilExpiry(exp) : null
                    const wDays = warrantyDays(item)
                    const zone = zones.find(z => z.id === item.zoneId)
                    const isExpired = days !== null && days < 0
                    const isExpiring = days !== null && days >= 0 && days <= 3
                    const itemValue = item.price ? item.price * item.quantity : null
                    const cs = conditionStyle(item.condition)

                    return (
                      <motion.div key={item.id} variants={fadeUp} transition={{ duration: 0.2 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                        {isDeviceTab ? (
                          /* Electronics / Appliances card */
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedItem(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedItem(item)
                              }
                            }}
                            className="card card-sm group transition-all hover:-translate-y-0.5 relative overflow-hidden cursor-pointer"
                          >
                            {wDays !== null && wDays <= 90 && (
                              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                                style={{ background: wDays < 0 ? '#DC2626' : wDays <= 30 ? '#D97706' : '#0891B2' }} />
                            )}
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: activeCat.bg }}>
                                <activeCat.icon className="w-5 h-5" style={{ color: activeCat.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.productName}</p>
                                {(item.brand || item.model) && (
                                  <p className="font-sans text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                                    {[item.brand, item.model].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <span className="badge badge-muted">{item.category}</span>
                                  {item.condition && (
                                    <span className="badge text-[10px]" style={{ color: cs.color, background: cs.bg }}>
                                      {item.condition}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button onClick={(event) => { event.stopPropagation(); removeItem(item.id, item.productName) }}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--dim)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dim)'; (e.currentTarget as HTMLElement).style.background = '' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="mt-3 pt-2.5 border-t space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Value</span>
                                <span className="font-sans text-xs font-semibold" style={{ color: 'var(--text)' }}>
                                  {itemValue !== null ? `\u20B9${itemValue.toFixed(0)}` : '--'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Purchased</span>
                                <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                                  {item.purchaseDate ? formatShortDate(item.purchaseDate) : '--'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Warranty</span>
                                <span
                                  className="font-sans text-xs font-semibold"
                                  style={{ color: wDays === null ? 'var(--muted)' : wDays < 0 ? '#DC2626' : wDays <= 30 ? '#D97706' : '#059669' }}
                                >
                                  {wDays === null ? '--' : wDays < 0 ? 'Expired' : wDays <= 30 ? `Expires in ${wDays}d` : `Valid until ${formatShortDate(item.warrantyExpiry!)}`}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Serial</span>
                                <span className="font-mono text-xs truncate max-w-[9rem]" style={{ color: 'var(--muted)' }}>
                                  {item.serialNumber || '--'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Kitchen / Documents card */
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedItem(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedItem(item)
                              }
                            }}
                            className="relative overflow-hidden rounded-2xl border p-4 group transition-all hover:-translate-y-0.5 cursor-pointer"
                            style={{ background: 'var(--surface)', borderColor: isExpired ? 'rgba(220,38,38,0.3)' : isExpiring ? 'rgba(217,119,6,0.3)' : 'var(--border)' }}>
                            {(isExpired || isExpiring) && (
                              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                                style={{ background: isExpired ? '#DC2626' : '#D97706' }} />
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.productName}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <span className="badge badge-muted">{item.category}</span>
                                  <span className="font-sans text-xs" style={{ color: 'var(--dim)' }}>x{item.quantity}</span>
                                  {zone && <span className="font-sans text-xs" style={{ color: 'var(--dim)' }}>· {zone.name}</span>}
                                </div>
                                {itemValue !== null && (
                                  <p className="font-sans text-xs font-bold mt-1.5" style={{ color: 'var(--muted)' }}>₹{itemValue.toFixed(2)}</p>
                                )}
                              </div>
                              {days !== null && (
                                <div className="shrink-0 px-2 py-1 rounded-xl text-xs font-bold"
                                  style={{
                                    color: days < 0 ? '#DC2626' : days <= 3 ? '#D97706' : '#059669',
                                    background: days < 0 ? 'rgba(220,38,38,0.1)' : days <= 3 ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.1)',
                                  }}>
                                  {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d`}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-sans text-[11px]" style={{ color: 'var(--dim)' }}>
                                  {exp ? `Exp ${formatShortDate(exp)}` : item.purchaseDate ? `Bought ${formatShortDate(item.purchaseDate)}` : '--'}
                                </span>
                                {item.orbitPredictedExpiry && (
                                  <span className="font-sans text-[10px] flex items-center gap-1" style={{ color: '#6366F1' }}>
                                    <span>✦</span>
                                    Orbit: {formatShortDate(item.orbitPredictedExpiry)}
                                    {item.orbitPredictedConfidence && (
                                      <span style={{ color: 'var(--dim)' }}>· {item.orbitPredictedConfidence}</span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {zone && isExpired && (
                                  <button onClick={(event) => { event.stopPropagation(); applyThumbsDown(item.id, zone.id, zone.name) }}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{ color: '#D97706' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.1)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={(event) => { event.stopPropagation(); removeItem(item.id, item.productName) }}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: 'var(--dim)' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)' }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dim)'; (e.currentTarget as HTMLElement).style.background = '' }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setShowAdd(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="card card-lg w-full max-w-md"
              style={{ maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,17,23,0.2)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>
                    Add to {activeCat.label}
                  </h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {isDeviceTab ? 'Track device details, purchase info & warranty' : 'Fill in the item details below'}
                  </p>
                </div>
                <button onClick={() => setShowAdd(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text)', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Entry method tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--elevated)' }}>
                {([
                  { key: 'manual' as EntryMethod, label: 'Manual', icon: Tag },
                  { key: 'barcode' as EntryMethod, label: 'Barcode', icon: Barcode },
                  { key: 'image' as EntryMethod, label: 'Scan', icon: Camera },
                ]).filter(m => !(activeTab === 'documents' && m.key === 'barcode')).map(m => {
                  const Icon = m.icon
                  return (
                    <button key={m.key} onClick={() => {
                      setEntryMethod(m.key)
                      if (m.key === 'barcode') openScanPicker('barcode')
                      if (m.key === 'image') openScanPicker('product')
                    }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={entryMethod === m.key
                        ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 4px rgba(15,17,23,0.08)' }
                        : { color: 'var(--muted)' }}>
                      <Icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3.5">
                {/* Name — hidden for documents (uses type picker instead) */}
                {activeTab !== 'documents' && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
                      {isDeviceTab ? 'Device name *' : 'Product name *'}
                    </label>
                    <input value={form.name} onChange={e => form.setName(e.target.value)}
                      placeholder={activeTab === 'electronics' ? 'e.g. iPhone 15 Pro, MacBook Air' : activeTab === 'appliances' ? 'e.g. Samsung Refrigerator' : 'e.g. Whole milk'}
                      className="orbit-input" autoFocus />
                  </div>
                )}

                {/* Electronics/Appliances: Brand + Model */}
                {isDeviceTab && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Building2 className="w-3 h-3" /> Brand
                      </label>
                      <input value={form.brand} onChange={e => form.setBrand(e.target.value)} placeholder="e.g. Apple, Samsung" className="orbit-input" />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Tag className="w-3 h-3" /> Model
                      </label>
                      <input value={form.model} onChange={e => form.setModel(e.target.value)} placeholder="e.g. M2, Galaxy S24" className="orbit-input" />
                    </div>
                  </div>
                )}

                {/* Category — hidden for documents (uses type picker) */}
                {activeTab !== 'documents' && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Category</label>
                    <select value={form.category} onChange={e => form.setCategory(e.target.value)} className="orbit-input">
                      {catOptions.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                )}

                {/* Condition for devices */}
                {isDeviceTab && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Star className="w-3 h-3" /> Condition
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {CONDITIONS.map(c => {
                        const cs = conditionStyle(c)
                        const isSelected = form.condition === c
                        return (
                          <button key={c} type="button" onClick={() => form.setCondition(c)}
                            className="py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                            style={isSelected
                              ? { background: cs.bg, color: cs.color, border: `1.5px solid ${cs.color}` }
                              : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}>
                            {c}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Qty + Price */}
                <div className={cn('grid gap-3', isDeviceTab ? 'grid-cols-1' : 'grid-cols-2')}>
                  {!isDeviceTab && (
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Quantity *</label>
                      <input value={form.quantity} onChange={e => form.setQuantity(e.target.value)} type="number" min="1" className="orbit-input" />
                    </div>
                  )}
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <DollarSign className="w-3 h-3" /> {isDeviceTab ? 'Purchase price' : 'Price paid'}
                    </label>
                    <input value={form.price} onChange={e => form.setPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="orbit-input" />
                  </div>
                </div>

                {/* Purchase date */}
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                    <Calendar className="w-3 h-3" /> Purchase date
                  </label>
                  <input value={form.purchaseDate} onChange={e => form.setPurchaseDate(e.target.value)} type="date" className="orbit-input" />
                </div>

                {/* Device: Warranty + Serial */}
                {isDeviceTab && (
                  <>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Shield className="w-3 h-3" /> Warranty expiry
                      </label>
                      <input value={form.warrantyExpiry} onChange={e => form.setWarrantyExpiry(e.target.value)} type="date" className="orbit-input" />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Hash className="w-3 h-3" /> Serial number
                      </label>
                      <input value={form.serialNumber} onChange={e => form.setSerialNumber(e.target.value)} placeholder="e.g. C02XG2JHJGH5" className="orbit-input font-mono" />
                    </div>
                  </>
                )}

                {/* Kitchen: Expiry + Zone */}
                {activeTab === 'kitchen' && (
                  <>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Calendar className="w-3 h-3" /> Expiry date
                      </label>
                      <input value={form.expiryDate} onChange={e => form.setExpiryDate(e.target.value)} type="date" className="orbit-input" />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <MapPin className="w-3 h-3" /> Storage zone
                      </label>
                      <div className="space-y-1.5">
                        <button type="button" onClick={() => form.setZone('')}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all"
                          style={form.zone === '' ? { borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)' } : { borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                            <MapPin className="w-3 h-3" style={{ color: '#6366F1' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-xs font-semibold" style={{ color: 'var(--text)' }}>Auto-assign</p>
                            <p className="font-sans text-[10px]" style={{ color: 'var(--dim)' }}>Recommended: {getRecommendedZone(form.category)}</p>
                          </div>
                          {form.zone === '' && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#6366F1' }} />}
                        </button>
                        {zones.map(z => {
                          const isSelected = form.zone === z.id
                          const tempIcon = z.temperature === 'freezer' ? 'FZ' : z.temperature === 'refrigerator' ? 'RF' : z.temperature === 'warm' ? 'WM' : 'PN'
                          return (
                            <button key={z.id} type="button" onClick={() => form.setZone(z.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all"
                              style={isSelected ? { borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)' } : { borderColor: 'var(--border)', background: 'var(--surface)' }}>
                              <span className="text-base shrink-0">{tempIcon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-sans text-xs font-semibold" style={{ color: 'var(--text)' }}>{z.name}</p>
                                <p className="font-sans text-[10px] capitalize" style={{ color: 'var(--dim)' }}>{z.temperature} · {z.humidity} humidity</p>
                              </div>
                              {isSelected && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#6366F1' }} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Documents: Expiry */}
                {activeTab === 'documents' && (
                  <>
                    {/* Document type picker — replaces free-text name */}
                    <div>
                      <label className="font-sans text-xs font-semibold mb-2 block" style={{ color: 'var(--muted)' }}>Document type *</label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {DOCUMENT_CATS.map(docType => (
                          <button key={docType} type="button"
                            onClick={() => { form.setCategory(docType); if (docType !== 'Other') form.setName(docType) }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all"
                            style={form.category === docType
                              ? { background: 'rgba(5,150,105,0.12)', color: '#059669', border: '1.5px solid rgba(5,150,105,0.35)' }
                              : { background: 'var(--elevated)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}>
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{docType}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Custom name for "Other" */}
                    {form.category === 'Other' && (
                      <div>
                        <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Document name *</label>
                        <input value={form.name} onChange={e => form.setName(e.target.value)}
                          placeholder="e.g. Club Membership Card" className="orbit-input" autoFocus />
                      </div>
                    )}
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Calendar className="w-3 h-3" /> Issue date
                      </label>
                      <input value={form.purchaseDate} onChange={e => form.setPurchaseDate(e.target.value)} type="date" className="orbit-input" />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Calendar className="w-3 h-3" /> Expiry / Renewal date
                      </label>
                      <input value={form.expiryDate} onChange={e => form.setExpiryDate(e.target.value)} type="date" className="orbit-input" />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
                        Upload document (optional)
                      </label>
                      <button type="button" onClick={() => documentRef.current?.click()} className="btn-ghost w-full justify-center">
                        <FileText className="w-3.5 h-3.5" /> {form.documentFileName ? 'Replace File' : 'Upload File'}
                      </button>
                      <input
                        ref={documentRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (file) await handleDocumentUpload(file)
                          event.currentTarget.value = ''
                        }}
                      />
                      {form.documentFileName && (
                        <p className="font-sans text-xs mt-1.5" style={{ color: 'var(--dim)' }}>
                          Attached: {form.documentFileName}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Notes */}
                <div>
                  <label className="font-sans text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>Notes (optional)</label>
                  <input value={form.notes} onChange={e => form.setNotes(e.target.value)} placeholder="Any additional details..." className="orbit-input" />
                </div>

                {/* Value preview */}
                {form.price && (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Total value</span>
                    <span className="font-sans text-sm font-semibold" style={{ color: '#6366F1' }}>
                      ₹{(parseFloat(form.price || '0') * parseInt(form.quantity || '1')).toFixed(2)}
                    </span>
                  </div>
                )}

                <button onClick={handleSave} disabled={(activeTab === 'documents' ? (!form.category || (form.category === 'Other' && !form.name.trim())) : !form.name.trim()) || saving}
                  className="btn-primary w-full py-2.5 mt-1 gap-2 disabled:opacity-40">
                  {saving ? 'Saving...' : `Add ${isDeviceTab ? 'Device' : 'Item'}`}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="card card-lg w-full max-w-lg"
              style={{ maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,17,23,0.2)' }}
            >
              {(() => {
                const zone = zones.find((z) => z.id === selectedItem.zoneId)
                const expiry = selectedItem.adjustedExpiryDate ?? selectedItem.expiryDate
                const expiryDays = expiry ? daysUntilExpiry(expiry) : null
                const warrantyDays = selectedItem.warrantyExpiry ? daysUntilExpiry(selectedItem.warrantyExpiry) : null
                const totalValue = selectedItem.price ? selectedItem.price * selectedItem.quantity : null

                return (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <p className="section-label mb-1">Item Details</p>
                        <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--text)' }}>
                          {selectedItem.productName}
                        </h3>
                        <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>
                          {selectedItem.tab.charAt(0).toUpperCase() + selectedItem.tab.slice(1)} · {selectedItem.category}
                        </p>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="w-7 h-7 rounded-lg flex items-center justify-center btn-ghost p-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Quantity</p>
                        <p className="font-sans text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{selectedItem.quantity}</p>
                      </div>
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Total value</p>
                        <p className="font-sans text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
                          {totalValue !== null ? `\u20B9${totalValue.toFixed(2)}` : '--'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--elevated)' }}>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Added on</span>
                        <span className="font-sans text-xs font-semibold" style={{ color: 'var(--text)' }}>{formatShortDate(selectedItem.addedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--elevated)' }}>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Purchase / Issue date</span>
                        <span className="font-sans text-xs font-semibold" style={{ color: 'var(--text)' }}>{selectedItem.purchaseDate ? formatShortDate(selectedItem.purchaseDate) : '--'}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--elevated)' }}>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Expiry / Renewal date</span>
                        <span className="font-sans text-xs font-semibold" style={{ color: expiryDays !== null && expiryDays < 0 ? '#DC2626' : 'var(--text)' }}>
                          {expiry ? formatShortDate(expiry) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--elevated)' }}>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>Warranty</span>
                        <span className="font-sans text-xs font-semibold" style={{ color: warrantyDays === null ? 'var(--text)' : warrantyDays < 0 ? '#DC2626' : warrantyDays <= 30 ? '#D97706' : '#059669' }}>
                          {warrantyDays === null ? '--' : warrantyDays < 0 ? 'Expired' : `Active (${warrantyDays}d left)`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Brand</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text)' }}>{selectedItem.brand || '--'}</p>
                      </div>
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Model</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text)' }}>{selectedItem.model || '--'}</p>
                      </div>
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Condition</p>
                        <p className="font-sans text-xs mt-0.5 capitalize" style={{ color: 'var(--text)' }}>{selectedItem.condition || '--'}</p>
                      </div>
                      <div className="card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>Storage zone</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--text)' }}>{zone?.name || '--'}</p>
                      </div>
                    </div>

                    <div className="mt-4 card card-sm">
                      <p className="font-sans text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--dim)' }}>Serial / Barcode</p>
                      <p className="font-mono text-xs" style={{ color: 'var(--text)' }}>
                        {selectedItem.serialNumber || selectedItem.barcode || '--'}
                      </p>
                    </div>

                    {selectedItem.tab === 'documents' && (
                      <div className="mt-4 card card-sm">
                        <p className="font-sans text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--dim)' }}>Attached File</p>
                        <p className="font-sans text-xs mb-2" style={{ color: 'var(--text)' }}>
                          {selectedItem.documentFileName || 'No file attached'}
                        </p>
                        {selectedItem.documentDataUrl && (
                          <button
                            type="button"
                            className="btn-primary w-full justify-center"
                            onClick={() => {
                              window.open(selectedItem.documentDataUrl, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            Open Document
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-4 card card-sm">
                      <p className="font-sans text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--dim)' }}>Notes</p>
                      <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                        {selectedItem.notes || 'No additional notes.'}
                      </p>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scanPickerMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setScanPickerMode(null)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={event => event.stopPropagation()}
              className="card card-md w-full max-w-sm"
            >
              <p className="font-sans text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                {scanPickerMode === 'barcode' ? 'Barcode Scan Source' : 'CV Scan Source'}
              </p>
              <p className="font-sans text-xs mb-4" style={{ color: 'var(--muted)' }}>
                Choose how you want to scan: upload an image or capture with your camera.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={chooseUpload} className="btn-ghost gap-1.5 justify-center">
                  <Camera className="w-3.5 h-3.5" /> Upload Image
                </button>
                <button onClick={chooseCamera} className="btn-primary gap-1.5 justify-center">
                  <ScanLine className="w-3.5 h-3.5" /> Use Camera
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={closeCamera}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={event => event.stopPropagation()}
              className="card card-lg w-full max-w-md"
            >
              <p className="font-sans text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                {cameraMode === 'barcode' ? 'Capture Barcode' : 'Capture Product'}
              </p>
              <p className="font-sans text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Frame the item clearly, then capture.
              </p>

              <div className="rounded-xl overflow-hidden border mb-3" style={{ borderColor: 'var(--border)', background: 'var(--elevated)' }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
              </div>

              {cameraError && (
                <p className="font-sans text-xs mb-3" style={{ color: '#DC2626' }}>{cameraError}</p>
              )}

              <div className="flex items-center gap-2">
                <button onClick={closeCamera} className="btn-ghost">Cancel</button>
                <button onClick={captureFromCamera} className="btn-primary gap-1.5" disabled={Boolean(cameraError)}>
                  <Camera className="w-3.5 h-3.5" /> Capture
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </AppShell>
  )
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={(
        <AppShell title="Inventory" subtitle="Loading inventory...">
          <div className="max-w-5xl mx-auto">
            <div className="card card-lg">
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                Loading inventory...
              </p>
            </div>
          </div>
        </AppShell>
      )}
    >
      <InventoryPageContent />
    </Suspense>
  )
}



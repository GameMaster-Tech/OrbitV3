import type { StorageZone, InventoryItem, DecayAdjustment } from '@/types'

// Default zones configuration.
export const DEFAULT_ZONES: Omit<StorageZone, 'id' | 'createdAt'>[] = [
  { name: 'Main Fridge', decayMultiplier: 1.0, temperature: 'refrigerator', humidity: 'medium', itemCount: 0, spoilageCount: 0 },
  { name: 'Crisper Drawer', decayMultiplier: 0.9, temperature: 'refrigerator', humidity: 'high', itemCount: 0, spoilageCount: 0 },
  { name: 'Fruit Drawer', decayMultiplier: 1.0, temperature: 'refrigerator', humidity: 'low', itemCount: 0, spoilageCount: 0 },
  { name: 'Freezer', decayMultiplier: 0.2, temperature: 'freezer', humidity: 'low', itemCount: 0, spoilageCount: 0 },
  { name: 'Pantry', decayMultiplier: 1.0, temperature: 'room', humidity: 'low', itemCount: 0, spoilageCount: 0 },
  { name: 'Counter', decayMultiplier: 1.3, temperature: 'warm', humidity: 'medium', itemCount: 0, spoilageCount: 0 },
]

// Recommended zones by item category.
const CATEGORY_ZONE_MAP: Record<string, string> = {
  dairy: 'Main Fridge',
  meat: 'Main Fridge',
  seafood: 'Main Fridge',
  produce: 'Crisper Drawer',
  vegetables: 'Crisper Drawer',
  fruits: 'Fruit Drawer',
  frozen: 'Freezer',
  pantry: 'Pantry',
  grains: 'Pantry',
  canned: 'Pantry',
  snacks: 'Pantry',
  bread: 'Counter',
  bananas: 'Counter',
}

// Simple Q10 approximation: many biological/chemical rates roughly double per +10C.
const Q10 = 2
const BASELINE_TEMP_C = 4
const ZONE_TEMP_C: Record<StorageZone['temperature'], number> = {
  freezer: -18,
  refrigerator: 4,
  room: 22,
  warm: 30,
}

const CATEGORY_HUMIDITY: Record<string, 'low' | 'medium' | 'high'> = {
  produce: 'high',
  vegetables: 'high',
  fruits: 'low',
  herbs: 'high',
  leafy: 'high',
  grains: 'low',
  bread: 'low',
  snacks: 'low',
  spices: 'low',
  pantry: 'low',
}

function getHumidityFactor(category: string | undefined, humidity: StorageZone['humidity'] | undefined): number {
  if (!humidity) return 1
  const preferred = CATEGORY_HUMIDITY[(category ?? '').toLowerCase()] ?? 'medium'

  if (preferred === humidity) return 0.92
  if (preferred === 'high' && humidity === 'medium') return 1.02
  if (preferred === 'high' && humidity === 'low') return 1.18
  if (preferred === 'low' && humidity === 'medium') return 1.03
  if (preferred === 'low' && humidity === 'high') return 1.16
  return 1
}

export function getRecommendedZone(category: string): string {
  return CATEGORY_ZONE_MAP[category.toLowerCase()] ?? 'Pantry'
}

export function calculateAdjustedExpiry(
  originalExpiry: Date,
  decayMultiplier: number,
  options?: {
    temperature?: StorageZone['temperature']
    humidity?: StorageZone['humidity']
    category?: string
  }
): DecayAdjustment {
  const now = Date.now()
  const originalMs = originalExpiry.getTime()
  const remainingMs = originalMs - now

  if (remainingMs <= 0) {
    return {
      originalExpiry,
      adjustedExpiry: originalExpiry,
      daysAdjusted: 0,
      reason: 'Item already expired',
    }
  }

  const tempC = options?.temperature ? ZONE_TEMP_C[options.temperature] : BASELINE_TEMP_C
  const tempFactor = Math.pow(Q10, (tempC - BASELINE_TEMP_C) / 10)
  const humidityFactor = getHumidityFactor(options?.category, options?.humidity)
  const manualFactor = Math.max(0.5, Math.min(2.0, decayMultiplier))

  // Combined factor >1 shortens shelf life, <1 extends it.
  const combinedFactor = Math.max(0.15, Math.min(3, tempFactor * humidityFactor * manualFactor))
  const adjustedMs = now + remainingMs / combinedFactor
  const adjustedExpiry = new Date(adjustedMs)
  const daysAdjusted = Math.round((originalMs - adjustedMs) / (1000 * 60 * 60 * 24))

  const reason = [
    `Q10 temp factor ${tempFactor.toFixed(2)}`,
    `humidity factor ${humidityFactor.toFixed(2)}`,
    `zone feedback factor ${manualFactor.toFixed(2)}`,
  ].join(' · ')

  return { originalExpiry, adjustedExpiry, daysAdjusted, reason }
}

export function updateDecayMultiplier(zone: StorageZone, delta = 0.05): StorageZone {
  const newMultiplier = Math.min(2.0, Math.max(0.5, zone.decayMultiplier + delta))
  return {
    ...zone,
    decayMultiplier: Number(newMultiplier.toFixed(2)),
    spoilageCount: (zone.spoilageCount ?? 0) + 1,
  }
}

export function analyzeZonePerformance(zone: StorageZone): {
  status: 'excellent' | 'good' | 'fair' | 'poor'
  label: string
  color: string
} {
  const { decayMultiplier, spoilageCount } = zone
  if (decayMultiplier <= 0.8 && spoilageCount < 3) return { status: 'excellent', label: 'Excellent', color: 'text-orbit-success' }
  if (decayMultiplier <= 1.1 && spoilageCount < 8) return { status: 'good', label: 'Good', color: 'text-orbit-primary' }
  if (decayMultiplier <= 1.4) return { status: 'fair', label: 'Fair', color: 'text-orbit-warning' }
  return { status: 'poor', label: 'Poor', color: 'text-orbit-critical' }
}

export function getZoneColor(zone: StorageZone): string {
  const perf = analyzeZonePerformance(zone)
  return perf.color
}

export function recalculateItemsForZone(items: InventoryItem[], zone: Pick<StorageZone, 'decayMultiplier' | 'temperature' | 'humidity'>): InventoryItem[] {
  return items.map((item) => {
    if (!item.expiryDate) return item
    const adjustment = calculateAdjustedExpiry(new Date(item.expiryDate), zone.decayMultiplier, {
      temperature: zone.temperature,
      humidity: zone.humidity,
      category: item.category,
    })
    return { ...item, adjustedExpiryDate: adjustment.adjustedExpiry }
  })
}

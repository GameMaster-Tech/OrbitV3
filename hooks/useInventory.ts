'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  listenInventory,
  getZones,
  applyZoneThumbsDown,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  logActivity,
  addSmartCard,
  getHealthProfile,
} from '@/lib/database'
import { addExpense, getBudgets, saveBudget, getExpenses } from '@/lib/firestore'
import type { InventoryItem, StorageZone, InventoryTab, ExpenseCategory } from '@/types'

// Module-level zone cache persists across re-renders.
const zoneCache = new Map<string, StorageZone[]>()

type HealthProfileSnapshot = {
  allergies?: string[]
  conditions?: string[]
  dietaryRestrictions?: string[]
  medications?: Array<{ name?: string; dosage?: string }>
}

export function useInventory(uid: string | undefined) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [zones, setZones] = useState<StorageZone[]>([])
  const [loading, setLoading] = useState(true)
  const healthProfileRef = useRef<HealthProfileSnapshot | null>(null)
  const healthFetchedRef = useRef(false)

  useEffect(() => {
    healthFetchedRef.current = false
    healthProfileRef.current = null
  }, [uid])

  useEffect(() => {
    if (!uid) return

    let active = true
    const loadingTimer = setTimeout(() => {
      if (active) setLoading(true)
    }, 0)

    if (zoneCache.has(uid)) {
      const cachedZones = zoneCache.get(uid) ?? []
      setTimeout(() => {
        if (active) setZones(cachedZones)
      }, 0)
    } else {
      getZones(uid)
        .then((loadedZones) => {
          zoneCache.set(uid, loadedZones)
          setZones(loadedZones)
        })
        .catch(() => {
          setZones([])
        })
    }

    const unsub = listenInventory(uid, (data) => {
      setItems(data)
      setLoading(false)
    })

    if (!healthFetchedRef.current) {
      healthFetchedRef.current = true
      getHealthProfile(uid)
        .then((profile) => {
          healthProfileRef.current = profile
        })
        .catch(() => {
          healthProfileRef.current = null
        })
    }

    return () => {
      active = false
      clearTimeout(loadingTimer)
      unsub()
    }
  }, [uid])

  const addItem = useCallback(
    async (item: Omit<InventoryItem, 'id'>) => {
      if (!uid) return
      const id = await addInventoryItem(uid, item)

      // Fire-and-forget logging.
      logActivity(uid, {
        type: 'add',
        message: `Added ${item.productName} to ${item.tab}`,
        itemId: id,
        timestamp: new Date(),
      }).catch(() => {})

      // Auto-sync expense: if item has a price, log it to wallet expenses
      if (item.price && item.price > 0) {
        const totalCost = item.price * (item.quantity || 1)

        // Map inventory tab/category → expense category
        const expenseCategoryMap: Record<string, ExpenseCategory> = {
          kitchen:     'groceries',
          electronics: 'electronics',
          appliances:  'utilities',
          documents:   'other',
        }
        const expenseCategory: ExpenseCategory = expenseCategoryMap[item.tab] ?? 'shopping'

        // Log the expense
        addExpense(uid, {
          amount: totalCost,
          category: expenseCategory,
          description: `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`,
          date: new Date(),
          sourceItemId: id,
        }).then(async () => {
          // Update matching budget's spent field
          try {
            const budgets = await getBudgets(uid)
            const match = budgets.find(b => b.category === expenseCategory)
            if (match) {
              const now = new Date()
              // Re-fetch all expenses to compute accurate spent
              const allExpenses = await getExpenses(uid)
              const newSpent = allExpenses
                .filter(e => {
                  if (e.category !== match.category) return false
                  const d = new Date(e.date)
                  if (match.period === 'daily') return d.toDateString() === now.toDateString()
                  if (match.period === 'weekly') {
                    const ws = new Date(now); ws.setDate(now.getDate() - 7); return d >= ws
                  }
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                })
                .reduce((s, e) => s + e.amount, 0)
              await saveBudget(uid, { ...match, spent: newSpent })
            }
          } catch {
            // non-fatal
          }
        }).catch(() => {})
      }

      // Health check remains non-blocking.
      const runHealthCheck = async () => {
        try {
          const health = healthProfileRef.current
          if (!health) return

          const hasData =
            health.allergies?.length ||
            health.conditions?.length ||
            health.dietaryRestrictions?.length ||
            health.medications?.length

          if (!hasData) return

          const res = await fetch('/api/ai/health-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item: { productName: item.productName, category: item.category },
              allergies: health.allergies ?? [],
              conditions: health.conditions ?? [],
              dietaryRestrictions: health.dietaryRestrictions ?? [],
              medications:
                health.medications?.map((medication) => ({
                  name: medication.name ?? '',
                  dosage: medication.dosage ?? '',
                })) ?? [],
            }),
          })

          const check = await res.json()
          if (check.hasConflict && check.reason) {
            const altText = check.alternatives?.length
              ? ` Try: ${check.alternatives.slice(0, 2).join(', ')}.`
              : ''

            addSmartCard(uid, {
              type: 'healthConflict',
              priority: check.severity ?? 'high',
              title: `Health Alert - ${item.productName}`,
              message: `${check.reason}${altText}`,
              itemId: id,
              actions: [
                { label: 'View Health', type: 'view', href: '/health' },
                { label: 'Dismiss', type: 'ignore' },
              ],
              timestamp: new Date(),
              read: false,
            }).catch(() => {})
          }
        } catch {
          // Intentionally silent.
        }
      }

      runHealthCheck()
      return id
    },
    [uid]
  )

  const updateItem = useCallback(
    async (itemId: string, data: Partial<InventoryItem>) => {
      if (!uid) return
      await updateInventoryItem(uid, itemId, data)
    },
    [uid]
  )

  const removeItem = useCallback(
    async (itemId: string, productName: string) => {
      if (!uid) return
      await deleteInventoryItem(uid, itemId)
      logActivity(uid, {
        type: 'remove',
        message: `Removed ${productName} from inventory`,
        itemId,
        timestamp: new Date(),
      }).catch(() => {})
    },
    [uid]
  )

  const applyThumbsDown = useCallback(
    async (itemId: string, zoneId: string, zoneName: string) => {
      if (!uid) return
      await applyZoneThumbsDown(uid, zoneId)
      logActivity(uid, {
        type: 'zone',
        message: `Zone "${zoneName}" decay adjusted`,
        itemId,
        timestamp: new Date(),
      }).catch(() => {})

      const updated = await getZones(uid)
      zoneCache.set(uid, updated)
      setZones(updated)
    },
    [uid]
  )

  const getItemsByTab = useCallback(
    (tab: InventoryTab) => items.filter((item) => item.tab === tab),
    [items]
  )

  const getExpiringItems = useCallback(
    (withinDays = 3) => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + withinDays)

      return items.filter((item) => {
        const expiry = item.adjustedExpiryDate ?? item.expiryDate
        if (!expiry) return false

        const expiryDate = new Date(expiry)
        return expiryDate >= new Date() && expiryDate <= cutoff
      })
    },
    [items]
  )

  return {
    items: uid ? items : [],
    zones: uid ? zones : [],
    loading: uid ? loading : false,
    addItem,
    updateItem,
    removeItem,
    applyThumbsDown,
    getItemsByTab,
    getExpiringItems,
  }
}


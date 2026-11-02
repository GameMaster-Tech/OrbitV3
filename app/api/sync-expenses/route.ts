import { NextRequest, NextResponse } from 'next/server'
import { ref, get, push, set } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import type { InventoryItem, Expense, ExpenseCategory } from '@/types'

const TAB_TO_CATEGORY: Record<string, ExpenseCategory> = {
  kitchen:     'groceries',
  electronics: 'electronics',
  appliances:  'utilities',
  documents:   'other',
}

function userRef(...path: string[]) {
  return ref(rtdb!, ['users', ...path].join('/'))
}

function snapToArray<T>(val: unknown): T[] {
  if (!val) return []
  return Object.entries(val as Record<string, unknown>).map(([id, v]) => ({
    ...(v as object),
    id,
  })) as T[]
}

export async function POST(req: NextRequest) {
  try {
    if (!rtdb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const { uid } = await req.json()
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid required' }, { status: 400 })
    }

    // Load inventory and existing expenses in parallel
    const [invSnap, expSnap] = await Promise.all([
      get(userRef(uid, 'inventory')),
      get(userRef(uid, 'expenses')),
    ])

    const items = snapToArray<InventoryItem>(invSnap.val())
    const existingExpenses = snapToArray<Expense>(expSnap.val())

    // Build a set of item IDs that already have a synced expense
    // We tag synced expenses with sourceItemId so we can deduplicate
    const syncedItemIds = new Set(
      existingExpenses
        .filter((e) => (e as Expense & { sourceItemId?: string }).sourceItemId)
        .map((e) => (e as Expense & { sourceItemId?: string }).sourceItemId!)
    )

    // Find items with a price that haven't been synced yet
    const toSync = items.filter(
      (item) => item.price && item.price > 0 && !syncedItemIds.has(item.id)
    )

    if (toSync.length === 0) {
      return NextResponse.json({ synced: 0, message: 'Already up to date' })
    }

    // Write each missing expense
    const writes = toSync.map(async (item) => {
      const category: ExpenseCategory = TAB_TO_CATEGORY[item.tab] ?? 'shopping'
      const amount = item.price! * (item.quantity || 1)
      const date = item.purchaseDate
        ? new Date(item.purchaseDate).toISOString()
        : item.addedAt
          ? new Date(item.addedAt).toISOString()
          : new Date().toISOString()

      const r = push(userRef(uid, 'expenses'))
      await set(r, {
        amount,
        category,
        description: `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`,
        date,
        sourceItemId: item.id, // tag so we never double-sync
      })
    })

    await Promise.all(writes)

    return NextResponse.json({ synced: toSync.length })
  } catch (err) {
    console.error('[sync-expenses]', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

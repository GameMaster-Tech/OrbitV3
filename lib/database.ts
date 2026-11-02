// lib/database.ts — All data operations using Firebase Realtime Database.
import {
  ref, set, get, update, remove, push, onValue, off, runTransaction,
  type DataSnapshot, type DatabaseReference, type Unsubscribe,
} from 'firebase/database'
import { rtdb } from './firebase'
import type {
  UserProfile, InventoryItem, StorageZone, HealthProfile,
  UserWallet, Expense, Budget, ActivityLog, SmartCardData,
  SwapOffer, LibraryRecipe, PantryItem, PairingMode,
  ProfileVisibility, NearbyPairingUser, SmartPairMatch, SwapRequest,
  SmartPairAction, SmartPairMatchStatus,
} from '@/types'
import { getCommunityKey, normalizeIngredientName, slugify } from './utils'
import { calculateAdjustedExpiry, DEFAULT_ZONES } from './zoneService'

// helpers

const noop = () => {}

function userRef(uid: string, ...path: string[]): DatabaseReference {
  return ref(rtdb!, ['users', uid, ...path].join('/'))
}

function communityRef(...path: string[]): DatabaseReference {
  return ref(rtdb!, ['communities', ...path].join('/'))
}

function smartPairingRef(...path: string[]): DatabaseReference {
  return ref(rtdb!, ['smartPairing', ...path].join('/'))
}

function usersRootRef(): DatabaseReference {
  return ref(rtdb!, 'users')
}

/** Convert RTDB snapshot object to typed array with id injected */
function snapToArray<T>(snap: unknown): T[] {
  if (!snap) return []
  return Object.entries(snap as Record<string, unknown>).map(([id, val]) => ({
    ...(val as object),
    id,
  })) as T[]
}

/** Strip undefined/null so RTDB doesn't reject */
function clean<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>
}

// Dates -> ISO strings for storage
function dateToStr(d: Date | string | undefined): string | undefined {
  if (!d) return undefined
  return d instanceof Date ? d.toISOString() : d
}

// ISO strings -> Dates on read
function hydrateItem<T extends object>(id: string, raw: object): T {
  const DATE_KEYS = [
    'addedAt','expiryDate','adjustedExpiryDate','purchaseDate','warrantyExpiry',
    'orbitPredictedExpiry',
    'createdAt','updatedAt','lastActive','startDate','endDate','timestamp','date',
    'completedAt','generatedAt','expiresAt','lastNotificationAt','respondedAt',
  ]
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>), id }
  for (const key of DATE_KEYS) {
    if (typeof out[key] === 'string') out[key] = new Date(out[key])
    if (typeof out[key] === 'number') out[key] = new Date(out[key])
  }
  return out as unknown as T
}

function normalizePairingMode(mode: unknown): PairingMode {
  if (mode === 'private' || mode === 'passive' || mode === 'active' || mode === 'social') return mode
  return 'passive'
}

function normalizeProfileVisibility(value: unknown): ProfileVisibility {
  if (value === 'anonymous' || value === 'matched' || value === 'public') return value
  return 'matched'
}

function getClusterId(profile: Pick<UserProfile, 'clusterId' | 'location'>): string {
  if (profile.clusterId && profile.clusterId.trim()) return profile.clusterId.trim()
  return getCommunityKey(profile.location.city || 'unknown', profile.location.state || 'unknown')
}

function toPantryItem(ownerUserId: string, item: InventoryItem): PantryItem {
  const expiryDate = item.adjustedExpiryDate ?? item.expiryDate
  const normalizedName = normalizeIngredientName(item.productName)
  const expiringSoon = isExpiringSoon(expiryDate)

  return {
    id: item.id,
    name: item.productName,
    normalizedName,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    isExpiringSoon: expiringSoon,
    shareable: item.shareable ?? item.tab === 'kitchen',
    ownerUserId,
  }
}

function matchKeyForUsers(userAId: string, userBId: string, recipeName: string): string {
  const [first, second] = [userAId, userBId].sort()
  return `${first}__${second}__${slugify(recipeName)}`
}

function isExpiringSoon(expiryDate?: Date | string): boolean {
  if (!expiryDate) return false
  const ms = new Date(expiryDate).getTime() - Date.now()
  return ms >= 0 && ms <= (1000 * 60 * 60 * 24 * 5)
}

// user profile

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!rtdb) return null
  const snap = await get(userRef(uid, 'profile'))
  if (!snap.exists()) return null
  const profile = hydrateItem<UserProfile>(uid, snap.val())
  return {
    ...profile,
    pairingMode: normalizePairingMode(profile.pairingMode),
    profileVisibility: normalizeProfileVisibility(profile.profileVisibility),
    clusterId: getClusterId(profile),
    buildingId: profile.buildingId?.trim() || getClusterId(profile),
    pairingDisplayName: profile.pairingDisplayName || profile.displayName,
  }
}

export function listenUserProfile(uid: string, cb: (profile: UserProfile | null) => void): Unsubscribe {
  if (!rtdb) { cb(null); return noop }
  const r = userRef(uid, 'profile')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb(null); return }
    const profile = hydrateItem<UserProfile>(uid, snap.val())
    cb({
      ...profile,
      pairingMode: normalizePairingMode(profile.pairingMode),
      profileVisibility: normalizeProfileVisibility(profile.profileVisibility),
      clusterId: getClusterId(profile),
      buildingId: profile.buildingId?.trim() || getClusterId(profile),
      pairingDisplayName: profile.pairingDisplayName || profile.displayName,
    })
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid'>): Promise<void> {
  if (!rtdb) return
  const clusterId = data.clusterId?.trim() || getCommunityKey(data.location.city || 'unknown', data.location.state || 'unknown')
  await set(userRef(uid, 'profile'), clean({
    ...data,
    uid,
    creditBalance: 50,
    pairingMode: normalizePairingMode(data.pairingMode),
    clusterId,
    buildingId: data.buildingId?.trim() || clusterId,
    pairingDisplayName: data.pairingDisplayName || data.displayName,
    profileVisibility: normalizeProfileVisibility(data.profileVisibility),
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  }))
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  if (!rtdb) return
  await update(userRef(uid, 'profile'), clean({ ...data, lastActive: new Date().toISOString() }))
}

export async function updateSmartPairingPreferences(
  uid: string,
  data: Partial<Pick<UserProfile, 'pairingMode' | 'buildingId' | 'clusterId' | 'pairingDisplayName' | 'profileVisibility'>>,
): Promise<void> {
  if (!rtdb) return
  const profile = await getUserProfile(uid)
  if (!profile) return

  const clusterId = data.clusterId?.trim() || profile.clusterId || getClusterId(profile)
  const buildingId = data.buildingId?.trim() || profile.buildingId || clusterId

  await update(userRef(uid, 'profile'), clean({
    pairingMode: data.pairingMode ? normalizePairingMode(data.pairingMode) : normalizePairingMode(profile.pairingMode),
    clusterId,
    buildingId,
    pairingDisplayName: data.pairingDisplayName?.trim() || profile.pairingDisplayName || profile.displayName,
    profileVisibility: data.profileVisibility ? normalizeProfileVisibility(data.profileVisibility) : normalizeProfileVisibility(profile.profileVisibility),
    lastActive: new Date().toISOString(),
  }))
}

// inventory

export function listenInventory(uid: string, cb: (items: InventoryItem[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'inventory')
  const handler = (snap: DataSnapshot) => {
    const val = snap.val()
    if (!val) { cb([]); return }
    const items = snapToArray<InventoryItem>(val)
      .map(i => hydrateItem<InventoryItem>(i.id, i))
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    cb(items)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function addInventoryItem(uid: string, item: Omit<InventoryItem, 'id'>): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const r = push(userRef(uid, 'inventory'))
  const expiryDate = item.adjustedExpiryDate ?? item.expiryDate
  await set(r, clean({
    productName:        item.productName,
    category:           item.category,
    tab:                item.tab,
    quantity:           item.quantity,
    unit:               item.unit,
    price:              item.price,
    barcode:            item.barcode,
    notes:              item.notes,
    documentDataUrl:    item.documentDataUrl,
    documentMimeType:   item.documentMimeType,
    documentFileName:   item.documentFileName,
    zoneId:             item.zoneId,
    brand:              item.brand,
    model:              item.model,
    serialNumber:       item.serialNumber,
    condition:          item.condition,
    normalizedName:     item.normalizedName ?? normalizeIngredientName(item.productName),
    isExpiringSoon:     item.isExpiringSoon ?? isExpiringSoon(expiryDate),
    shareable:          item.shareable ?? item.tab === 'kitchen',
    ownerUserId:        item.ownerUserId ?? uid,
    addedAt:            new Date().toISOString(),
    purchaseDate:       dateToStr(item.purchaseDate),
    expiryDate:         dateToStr(item.expiryDate),
    warrantyExpiry:     dateToStr(item.warrantyExpiry),
    adjustedExpiryDate: dateToStr(item.adjustedExpiryDate),
    orbitPredictedExpiry:      dateToStr(item.orbitPredictedExpiry),
    orbitPredictedConfidence:  item.orbitPredictedConfidence,
    orbitPredictedReason:      item.orbitPredictedReason,
  }))
  return r.key!
}

export async function updateInventoryItem(uid: string, itemId: string, data: Partial<InventoryItem>): Promise<void> {
  if (!rtdb) return
  const payload: Record<string, unknown> = { ...data }
  if (data.expiryDate)         payload.expiryDate         = dateToStr(data.expiryDate)
  if (data.adjustedExpiryDate) payload.adjustedExpiryDate = dateToStr(data.adjustedExpiryDate)
  if (data.purchaseDate)       payload.purchaseDate       = dateToStr(data.purchaseDate)
  if (data.orbitPredictedExpiry) {
    payload.orbitPredictedExpiry     = dateToStr(data.orbitPredictedExpiry)
    payload.orbitPredictedConfidence = data.orbitPredictedConfidence
    payload.orbitPredictedReason     = data.orbitPredictedReason
  }
  if (data.productName) payload.normalizedName = normalizeIngredientName(data.productName)
  const effectiveExpiry = data.adjustedExpiryDate ?? data.expiryDate
  if (effectiveExpiry) payload.isExpiringSoon = isExpiringSoon(effectiveExpiry)
  if (typeof data.shareable === 'boolean') payload.shareable = data.shareable
  if (typeof data.documentDataUrl === 'string') payload.documentDataUrl = data.documentDataUrl
  if (typeof data.documentMimeType === 'string') payload.documentMimeType = data.documentMimeType
  if (typeof data.documentFileName === 'string') payload.documentFileName = data.documentFileName
  await update(userRef(uid, 'inventory', itemId), clean(payload))
}

export async function deleteInventoryItem(uid: string, itemId: string): Promise<void> {
  if (!rtdb) return
  await remove(userRef(uid, 'inventory', itemId))
}

// zones

export async function getZones(uid: string): Promise<StorageZone[]> {
  if (!rtdb) return []
  const snap = await get(userRef(uid, 'zones'))
  if (!snap.exists()) return []
  return snapToArray<StorageZone>(snap.val()).map(z => hydrateItem<StorageZone>(z.id, z))
}

export async function createDefaultZones(uid: string): Promise<void> {
  if (!rtdb) return
  for (const zone of DEFAULT_ZONES) {
    const r = push(userRef(uid, 'zones'))
    await set(r, { ...zone, createdAt: new Date().toISOString() })
  }
}

export async function applyZoneThumbsDown(uid: string, zoneId: string): Promise<void> {
  if (!rtdb) return
  const zoneSnap = await get(userRef(uid, 'zones', zoneId))
  if (!zoneSnap.exists()) return
  const zone = zoneSnap.val() as StorageZone
  const newMultiplier = Math.min(2.0, (zone.decayMultiplier ?? 1.0) + 0.05)
  await update(userRef(uid, 'zones', zoneId), {
    decayMultiplier: newMultiplier,
    spoilageCount: (zone.spoilageCount ?? 0) + 1,
  })
  // Adjust expiry dates for items in this zone
  const invSnap = await get(userRef(uid, 'inventory'))
  if (!invSnap.exists()) return
  const items = snapToArray<InventoryItem>(invSnap.val())
  for (const item of items) {
    if (item.zoneId !== zoneId || !item.expiryDate) continue
    const adjustment = calculateAdjustedExpiry(new Date(item.expiryDate), newMultiplier, {
      temperature: zone.temperature,
      humidity: zone.humidity,
      category: item.category,
    })
    await update(userRef(uid, 'inventory', item.id), {
      adjustedExpiryDate: adjustment.adjustedExpiry.toISOString(),
    })
  }
}

// health

export async function getHealthProfile(uid: string): Promise<HealthProfile | null> {
  if (!rtdb) return null
  const snap = await get(userRef(uid, 'health'))
  if (!snap.exists()) return null
  return hydrateItem<HealthProfile>(uid, snap.val())
}

export async function saveHealthProfile(uid: string, data: Omit<HealthProfile, 'uid' | 'updatedAt'>): Promise<void> {
  if (!rtdb) return
  await set(userRef(uid, 'health'), { ...data, uid, updatedAt: new Date().toISOString() })
}

// wallet

export async function getWallet(uid: string): Promise<UserWallet | null> {
  if (!rtdb) return null
  const snap = await get(userRef(uid, 'wallet', 'data'))
  if (!snap.exists()) return null
  return snap.val() as UserWallet
}

export function listenWallet(uid: string, cb: (w: UserWallet | null) => void): Unsubscribe {
  if (!rtdb) { cb(null); return noop }
  const r = userRef(uid, 'wallet', 'data')
  const handler = (snap: DataSnapshot) => cb(snap.exists() ? snap.val() as UserWallet : null)
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function createWallet(uid: string): Promise<void> {
  if (!rtdb) return
  await set(userRef(uid, 'wallet', 'data'), { uid, balance: 50, totalEarned: 50, totalSpent: 0 })
}

export async function adjustCredits(uid: string, delta: number, reason: string): Promise<void> {
  if (!rtdb) return
  const walletRef = userRef(uid, 'wallet', 'data')
  let nextBalance = 0
  const tx = await runTransaction(walletRef, (currentWallet) => {
    const wallet = (currentWallet as UserWallet) || { uid, balance: 50, totalEarned: 50, totalSpent: 0 }
    nextBalance = Math.max(0, (wallet.balance ?? 0) + delta)
    return {
      ...wallet,
      balance: nextBalance,
      ...(delta > 0 ? { totalEarned: (wallet.totalEarned ?? 0) + delta } : { totalSpent: (wallet.totalSpent ?? 0) - delta }),
    }
  })

  if (tx.committed) {
    await update(userRef(uid, 'profile'), { creditBalance: nextBalance }).catch(() => {})
    const txRef = push(userRef(uid, 'wallet', 'transactions'))
    await set(txRef, { uid, type: delta > 0 ? 'credit' : 'debit', amount: Math.abs(delta), reason, timestamp: new Date().toISOString() })
  }
}

// expenses and budgets

export async function getExpenses(uid: string): Promise<Expense[]> {
  if (!rtdb) return []
  const snap = await get(userRef(uid, 'expenses'))
  if (!snap.exists()) return []
  return snapToArray<Expense>(snap.val())
    .map(e => hydrateItem<Expense>(e.id, e))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100)
}

export async function addExpense(uid: string, expense: Omit<Expense, 'id'>): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const r = push(userRef(uid, 'expenses'))
  await set(r, clean({ ...expense, date: dateToStr(expense.date) ?? new Date().toISOString() }))
  return r.key!
}

export function listenExpenses(uid: string, cb: (expenses: Expense[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'expenses')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const expenses = snapToArray<Expense>(snap.val())
      .map(e => hydrateItem<Expense>(e.id, e))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100)
    cb(expenses)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function getBudgets(uid: string): Promise<Budget[]> {
  if (!rtdb) return []
  const snap = await get(userRef(uid, 'budgets'))
  if (!snap.exists()) return []
  return snapToArray<Budget>(snap.val())
}

export function listenBudgets(uid: string, cb: (budgets: Budget[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'budgets')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    cb(snapToArray<Budget>(snap.val()))
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function saveBudget(uid: string, budget: Omit<Budget, 'id'>): Promise<void> {
  if (!rtdb) return
  const snap = await get(userRef(uid, 'budgets'))
  const existing = snap.exists()
    ? snapToArray<Budget>(snap.val()).find(b => b.category === budget.category && b.period === budget.period)
    : null
  if (existing) {
    await update(userRef(uid, 'budgets', existing.id), budget)
  } else {
    const r = push(userRef(uid, 'budgets'))
    await set(r, budget)
  }
}

// activity logs

export async function logActivity(uid: string, entry: Omit<ActivityLog, 'id'>): Promise<void> {
  if (!rtdb) return
  const r = push(userRef(uid, 'activityLogs'))
  await set(r, { ...entry, timestamp: new Date().toISOString() })
}

export function listenActivityLogs(uid: string, cb: (logs: ActivityLog[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'activityLogs')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const logs = snapToArray<ActivityLog>(snap.val())
      .map(l => hydrateItem<ActivityLog>(l.id, l))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
    cb(logs)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

// smart cards

export async function addSmartCard(uid: string, card: Omit<SmartCardData, 'id'>): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const r = push(userRef(uid, 'smartCards'))
  await set(r, { ...card, timestamp: new Date().toISOString(), read: false })
  return r.key!
}

export function listenSmartCards(uid: string, cb: (cards: SmartCardData[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'smartCards')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const cards = snapToArray<SmartCardData>(snap.val())
      .map(c => hydrateItem<SmartCardData>(c.id, c))
      .filter(c => !c.read)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
    cb(cards)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function dismissSmartCard(uid: string, cardId: string): Promise<void> {
  if (!rtdb) return
  await update(userRef(uid, 'smartCards', cardId), { read: true })
}

export function listenLibraryRecipes(uid: string, cb: (recipes: LibraryRecipe[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'libraryRecipes')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const recipes = snapToArray<LibraryRecipe>(snap.val())
      .map(recipe => hydrateItem<LibraryRecipe>(recipe.id, recipe))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    cb(recipes)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function addLibraryRecipe(
  uid: string,
  recipe: Omit<LibraryRecipe, 'id' | 'generatedAt' | 'favorite' | 'cooked'>
): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const r = push(userRef(uid, 'libraryRecipes'))
  await set(r, clean({
    ...recipe,
    generatedAt: new Date().toISOString(),
    favorite: false,
    cooked: false,
  }))
  return r.key!
}

export async function setLibraryRecipeFavorite(uid: string, recipeId: string, favorite: boolean): Promise<void> {
  if (!rtdb) return
  await update(userRef(uid, 'libraryRecipes', recipeId), { favorite })
}

export async function setLibraryRecipeCooked(uid: string, recipeId: string, cooked: boolean): Promise<void> {
  if (!rtdb) return
  await update(userRef(uid, 'libraryRecipes', recipeId), { cooked })
}

export async function deleteLibraryRecipe(uid: string, recipeId: string): Promise<void> {
  if (!rtdb) return
  await remove(userRef(uid, 'libraryRecipes', recipeId))
}

// SMART PAIRING

export interface SmartPairingNetworkSnapshot {
  currentProfile: UserProfile
  currentDietaryRestrictions: string[]
  currentExpiringItems: PantryItem[]
  nearbyUsers: NearbyPairingUser[]
}

function normalizedProfile(uid: string, raw: object): UserProfile {
  const profile = hydrateItem<UserProfile>(uid, raw)
  return {
    ...profile,
    pairingMode: normalizePairingMode(profile.pairingMode),
    profileVisibility: normalizeProfileVisibility(profile.profileVisibility),
    clusterId: getClusterId(profile),
    buildingId: profile.buildingId?.trim() || getClusterId(profile),
    pairingDisplayName: profile.pairingDisplayName || profile.displayName,
  }
}

function toPantryItems(uid: string, inventorySnap: unknown): PantryItem[] {
  const inventory = snapToArray<InventoryItem>(inventorySnap)
    .map((item) => hydrateItem<InventoryItem>(item.id, item))

  return inventory
    .filter((item) => item.tab === 'kitchen')
    .map((item) => toPantryItem(uid, item))
    .filter((item) => item.shareable && item.isExpiringSoon)
}

export async function loadSmartPairingNetwork(uid: string, options?: { expandRadius?: boolean }): Promise<SmartPairingNetworkSnapshot | null> {
  if (!rtdb) return null
  const usersSnap = await get(usersRootRef())
  if (!usersSnap.exists()) return null

  const users = usersSnap.val() as Record<string, {
    profile?: object
    inventory?: unknown
    health?: { dietaryRestrictions?: string[] }
  }>

  const currentRaw = users[uid]
  if (!currentRaw?.profile) return null

  const currentProfile = normalizedProfile(uid, currentRaw.profile)
  const currentCluster = getClusterId(currentProfile)
  const currentBuilding = currentProfile.buildingId?.trim() || currentCluster
  const currentState = currentProfile.location.state?.toLowerCase().trim()
  const currentDietaryRestrictions = Array.isArray(currentRaw.health?.dietaryRestrictions)
    ? currentRaw.health!.dietaryRestrictions!
    : []
  const currentExpiringItems = toPantryItems(uid, currentRaw.inventory)

  const nearbyUsers: NearbyPairingUser[] = []

  for (const [candidateUid, candidateRaw] of Object.entries(users)) {
    if (candidateUid === uid || !candidateRaw?.profile) continue

    const candidateProfile = normalizedProfile(candidateUid, candidateRaw.profile)
    const candidateMode = normalizePairingMode(candidateProfile.pairingMode)
    if (candidateMode === 'private') continue

    const candidateCluster = getClusterId(candidateProfile)
    const candidateBuilding = candidateProfile.buildingId?.trim() || candidateCluster
    const candidateState = candidateProfile.location.state?.toLowerCase().trim()

    const sameBuilding = currentBuilding.length > 0 && candidateBuilding === currentBuilding
    const sameCluster = candidateCluster === currentCluster
    const inRadius = Boolean(options?.expandRadius && currentState && candidateState && currentState === candidateState)

    if (!sameBuilding && !sameCluster && !inRadius) continue

    const pantryItems = toPantryItems(candidateUid, candidateRaw.inventory)
    if (pantryItems.length === 0) continue

    nearbyUsers.push({
      uid: candidateUid,
      pairingMode: candidateMode,
      profileVisibility: normalizeProfileVisibility(candidateProfile.profileVisibility),
      locationScope: sameBuilding ? 'building' : sameCluster ? 'cluster' : 'radius',
      pantryItems,
      dietaryRestrictions: Array.isArray(candidateRaw.health?.dietaryRestrictions) ? candidateRaw.health!.dietaryRestrictions! : [],
    })
  }

  return {
    currentProfile,
    currentDietaryRestrictions,
    currentExpiringItems,
    nearbyUsers,
  }
}

export function listenSmartPairMatches(uid: string, cb: (matches: SmartPairMatch[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'smartPairMatches')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const matches = snapToArray<SmartPairMatch>(snap.val())
      .map((match) => hydrateItem<SmartPairMatch>(match.id, match))
      .filter((match) => match.status !== 'expired')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    cb(matches)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export function listenSwapRequests(uid: string, cb: (requests: SwapRequest[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const r = userRef(uid, 'swapRequests')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const requests = snapToArray<SwapRequest>(snap.val())
      .map((request) => hydrateItem<SwapRequest>(request.id, request))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    cb(requests)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function getSmartPairMatch(uid: string, matchId: string): Promise<SmartPairMatch | null> {
  if (!rtdb) return null
  const snap = await get(userRef(uid, 'smartPairMatches', matchId))
  if (snap.exists()) return hydrateItem<SmartPairMatch>(matchId, snap.val())
  const canonical = await get(smartPairingRef('matches', matchId))
  if (!canonical.exists()) return null
  const canonicalMatch = hydrateItem<SmartPairMatch & {
    viewForA?: Pick<SmartPairMatch, 'yourIngredients' | 'nearbyComplementaryIngredients' | 'nearbyLabel' | 'actions'>
    viewForB?: Pick<SmartPairMatch, 'yourIngredients' | 'nearbyComplementaryIngredients' | 'nearbyLabel' | 'actions'>
  }>(matchId, canonical.val())

  const selectedView = uid === canonicalMatch.userBId
    ? canonicalMatch.viewForB
    : canonicalMatch.viewForA

  if (!selectedView) return canonicalMatch

  return {
    ...canonicalMatch,
    yourIngredients: selectedView.yourIngredients,
    nearbyComplementaryIngredients: selectedView.nearbyComplementaryIngredients,
    nearbyLabel: selectedView.nearbyLabel,
    actions: selectedView.actions,
  }
}

type UpsertSmartPairMatchInput = {
  userAId: string
  userBId: string
  recipeName: string
  recipeId?: string | null
  confidenceScore: number
  expiryUrgencyScore: number
  mealViabilityScore: number
  socialFrictionScore: number
  missingIngredients: string[]
  ingredientsForA: string[]
  nearbyIngredientsForA: string[]
  ingredientsForB: string[]
  nearbyIngredientsForB: string[]
  actionsForA: SmartPairAction[]
  actionsForB: SmartPairAction[]
  nearbyLabelForA: string
  nearbyLabelForB: string
  estimatedTimeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function upsertSmartPairMatch(input: UpsertSmartPairMatchInput): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()

  const matchId = matchKeyForUsers(input.userAId, input.userBId, input.recipeName)
  const [existingA, canonicalSnap] = await Promise.all([
    get(userRef(input.userAId, 'smartPairMatches', matchId)),
    get(smartPairingRef('matches', matchId)),
  ])
  const existingMatch = existingA.exists()
    ? hydrateItem<SmartPairMatch>(matchId, existingA.val())
    : canonicalSnap.exists()
      ? hydrateItem<SmartPairMatch>(matchId, canonicalSnap.val())
      : null

  const now = new Date()
  const expiresAt = existingMatch?.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 12)
  const terminalActive =
    existingMatch &&
    (existingMatch.status === 'declined' || existingMatch.status === 'expired') &&
    new Date(existingMatch.expiresAt).getTime() > Date.now()

  if (terminalActive) return matchId

  const status: SmartPairMatchStatus =
    existingMatch?.status === 'swap_accepted' || existingMatch?.status === 'cook_accepted'
      ? existingMatch.status
      : existingMatch?.status === 'viewed'
        ? 'viewed'
        : 'candidate'

  const base = {
    id: matchId,
    userAId: input.userAId,
    userBId: input.userBId,
    status,
    recipeName: input.recipeName,
    recipeId: input.recipeId ?? null,
    confidenceScore: input.confidenceScore,
    expiryUrgencyScore: input.expiryUrgencyScore,
    mealViabilityScore: input.mealViabilityScore,
    socialFrictionScore: input.socialFrictionScore,
    missingIngredients: input.missingIngredients,
    mutualOptInRevealed: existingMatch?.mutualOptInRevealed ?? false,
    counterpartDisplayName: existingMatch?.counterpartDisplayName,
    createdAt: existingMatch?.createdAt ?? now,
    expiresAt,
    updatedAt: now,
    estimatedTimeMinutes: input.estimatedTimeMinutes,
    difficulty: input.difficulty,
    lastNotificationAt: existingMatch?.lastNotificationAt,
  }

  await set(userRef(input.userAId, 'smartPairMatches', matchId), clean({
    ...base,
    yourIngredients: input.ingredientsForA,
    nearbyComplementaryIngredients: input.nearbyIngredientsForA,
    nearbyLabel: input.nearbyLabelForA,
    actions: input.actionsForA,
  }))

  await set(userRef(input.userBId, 'smartPairMatches', matchId), clean({
    ...base,
    yourIngredients: input.ingredientsForB,
    nearbyComplementaryIngredients: input.nearbyIngredientsForB,
    nearbyLabel: input.nearbyLabelForB,
    actions: input.actionsForB,
  }))

  await set(smartPairingRef('matches', matchId), clean({
    ...base,
    yourIngredients: input.ingredientsForA,
    nearbyComplementaryIngredients: input.nearbyIngredientsForA,
    nearbyLabel: input.nearbyLabelForA,
    actions: input.actionsForA,
    viewForA: {
      yourIngredients: input.ingredientsForA,
      nearbyComplementaryIngredients: input.nearbyIngredientsForA,
      nearbyLabel: input.nearbyLabelForA,
      actions: input.actionsForA,
    },
    viewForB: {
      yourIngredients: input.ingredientsForB,
      nearbyComplementaryIngredients: input.nearbyIngredientsForB,
      nearbyLabel: input.nearbyLabelForB,
      actions: input.actionsForB,
    },
  }))

  const shouldNotify = !existingMatch || !existingMatch.lastNotificationAt || (Date.now() - new Date(existingMatch.lastNotificationAt).getTime()) > (1000 * 60 * 60 * 6)
  if (shouldNotify) {
    await notifySmartPairMatch(input.userAId, input.recipeName)
    await notifySmartPairMatch(input.userBId, input.recipeName)
    const notifiedAt = new Date().toISOString()
    await update(userRef(input.userAId, 'smartPairMatches', matchId), { status: 'notified', lastNotificationAt: notifiedAt })
    await update(userRef(input.userBId, 'smartPairMatches', matchId), { status: 'notified', lastNotificationAt: notifiedAt })
    await update(smartPairingRef('matches', matchId), { status: 'notified', lastNotificationAt: notifiedAt })
  }

  return matchId
}

async function notifySmartPairMatch(uid: string, recipeName: string): Promise<void> {
  await addSmartCard(uid, {
    type: 'pairing',
    priority: 'high',
    title: 'Meal Match Nearby',
    message: `You have ingredients that pair with nearby surplus items to make ${recipeName}. Explore options.`,
    actions: [
      { label: 'Explore', type: 'view', href: '/smart-pairing' },
      { label: 'Dismiss', type: 'ignore' },
    ],
    timestamp: new Date(),
    read: false,
  })
}

export async function markSmartPairMatchViewed(uid: string, matchId: string): Promise<void> {
  if (!rtdb) return
  const match = await getSmartPairMatch(uid, matchId)
  if (!match) return
  if (match.status === 'swap_accepted' || match.status === 'cook_accepted') return
  await update(userRef(uid, 'smartPairMatches', matchId), { status: 'viewed', updatedAt: new Date().toISOString() })
  await update(smartPairingRef('matches', matchId), { status: 'viewed', updatedAt: new Date().toISOString() })
}

async function updateMatchForBothUsers(match: SmartPairMatch, patch: Partial<SmartPairMatch>): Promise<void> {
  const payload = clean({ ...patch, updatedAt: new Date().toISOString() })
  await update(userRef(match.userAId, 'smartPairMatches', match.id), payload)
  await update(userRef(match.userBId, 'smartPairMatches', match.id), payload)
  await update(smartPairingRef('matches', match.id), payload)
}

async function revealForBothUsers(match: SmartPairMatch): Promise<void> {
  const [profileA, profileB] = await Promise.all([
    getUserProfile(match.userAId),
    getUserProfile(match.userBId),
  ])

  const displayA = profileA && normalizeProfileVisibility(profileA.profileVisibility) !== 'anonymous'
    ? (profileA.pairingDisplayName || profileA.displayName.split(' ')[0])
    : 'Orbit user'
  const displayB = profileB && normalizeProfileVisibility(profileB.profileVisibility) !== 'anonymous'
    ? (profileB.pairingDisplayName || profileB.displayName.split(' ')[0])
    : 'Orbit user'

  await update(userRef(match.userAId, 'smartPairMatches', match.id), {
    mutualOptInRevealed: true,
    counterpartDisplayName: displayB,
    updatedAt: new Date().toISOString(),
  })
  await update(userRef(match.userBId, 'smartPairMatches', match.id), {
    mutualOptInRevealed: true,
    counterpartDisplayName: displayA,
    updatedAt: new Date().toISOString(),
  })
  await update(smartPairingRef('matches', match.id), {
    mutualOptInRevealed: true,
    updatedAt: new Date().toISOString(),
  })
}

export async function createSmartPairSwapRequest(
  uid: string,
  matchId: string,
  requestedItemNames: string[],
  offeredItemNames: string[],
  message: string,
): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const match = await getSmartPairMatch(uid, matchId)
  if (!match) throw new Error('Match not found')

  const requestId = `${matchId}__${uid}`
  const request: Omit<SwapRequest, 'id'> = {
    matchId,
    requestingUserId: uid,
    requestedItemNames,
    offeredItemNames,
    message,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await set(userRef(match.userAId, 'swapRequests', requestId), clean({
    ...request,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  await set(userRef(match.userBId, 'swapRequests', requestId), clean({
    ...request,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  await set(smartPairingRef('swapRequests', requestId), clean({
    ...request,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  await updateMatchForBothUsers(match, { status: 'swap_requested' })

  const targetUid = uid === match.userAId ? match.userBId : match.userAId
  await addSmartCard(targetUid, {
    type: 'pairing',
    priority: 'high',
    title: 'Swap Request Nearby',
    message: 'A nearby Orbit user requested an ingredient swap for a meal match.',
    actions: [{ label: 'Review', type: 'view', href: '/smart-pairing' }],
    timestamp: new Date(),
    read: false,
  })

  return requestId
}

export async function respondToSwapRequest(uid: string, requestId: string, response: 'accepted' | 'declined'): Promise<void> {
  if (!rtdb) return
  const [snap, canonical] = await Promise.all([
    get(userRef(uid, 'swapRequests', requestId)),
    get(smartPairingRef('swapRequests', requestId)),
  ])
  if (!snap.exists() && !canonical.exists()) throw new Error('Swap request not found')

  const request = snap.exists()
    ? hydrateItem<SwapRequest>(requestId, snap.val())
    : hydrateItem<SwapRequest>(requestId, canonical.val())
  const match = await getSmartPairMatch(uid, request.matchId)
  if (!match) throw new Error('Linked match not found')

  const patch = {
    status: response,
    respondedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await update(userRef(match.userAId, 'swapRequests', requestId), patch)
  await update(userRef(match.userBId, 'swapRequests', requestId), patch)
  await update(smartPairingRef('swapRequests', requestId), patch)

  if (response === 'accepted') {
    await updateMatchForBothUsers(match, { status: 'swap_accepted' })
    await revealForBothUsers(match)
  } else {
    await updateMatchForBothUsers(match, { status: 'declined' })
  }
}

export async function requestCookTogether(uid: string, matchId: string): Promise<void> {
  if (!rtdb) return
  const match = await getSmartPairMatch(uid, matchId)
  if (!match) throw new Error('Match not found')

  await updateMatchForBothUsers(match, { status: 'cook_requested' })

  const targetUid = uid === match.userAId ? match.userBId : match.userAId
  await addSmartCard(targetUid, {
    type: 'pairing',
    priority: 'medium',
    title: 'Cook Together Request',
    message: 'A nearby Orbit user is open to coordinating this meal match.',
    actions: [{ label: 'Review', type: 'view', href: '/smart-pairing' }],
    timestamp: new Date(),
    read: false,
  })
}

export async function respondToCookRequest(uid: string, matchId: string, accepted: boolean): Promise<void> {
  if (!rtdb) return
  const match = await getSmartPairMatch(uid, matchId)
  if (!match) throw new Error('Match not found')

  if (accepted) {
    await updateMatchForBothUsers(match, { status: 'cook_accepted' })
    await revealForBothUsers(match)
    return
  }

  await updateMatchForBothUsers(match, { status: 'declined' })
}

export async function declineSmartPairMatch(uid: string, matchId: string): Promise<void> {
  if (!rtdb) return
  const match = await getSmartPairMatch(uid, matchId)
  if (!match) return
  await updateMatchForBothUsers(match, { status: 'declined' })
}

// swapsync

export function listenSwapOffers(city: string, state: string, cb: (offers: SwapOffer[]) => void): Unsubscribe {
  if (!rtdb) { cb([]); return noop }
  const key = getCommunityKey(city, state)
  const r = communityRef(key, 'offers')
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) { cb([]); return }
    const offers = snapToArray<SwapOffer>(snap.val())
      .map(o => hydrateItem<SwapOffer>(o.id, o))
      .filter(o => o.status === 'active')
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    cb(offers)
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export async function createSwapOffer(offer: Omit<SwapOffer, 'id' | 'createdAt'>): Promise<string> {
  if (!rtdb) return 'dev-' + Date.now()
  const key = getCommunityKey(offer.communityCity, offer.communityState)
  const r = push(communityRef(key, 'offers'))
  await set(r, clean({
    ...offer,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiryDate: dateToStr(offer.expiryDate),
  }))
  return r.key!
}

export async function executeSwapTransaction(offer: SwapOffer, buyerId: string): Promise<void> {
  if (!rtdb) return
  if (offer.sellerId === buyerId) {
    throw new Error('You cannot purchase your own listing')
  }

  const PLATFORM_FEE = 0.15
  const platformFee = Math.round(offer.creditPrice * PLATFORM_FEE)
  const sellerReceives = offer.creditPrice - platformFee
  const key = getCommunityKey(offer.communityCity, offer.communityState)
  const offerPath = communityRef(key, 'offers', offer.id)
  const buyerWalletPath = userRef(buyerId, 'wallet', 'data')
  const sellerWalletPath = userRef(offer.sellerId, 'wallet', 'data')

  const activeOfferSnap = await get(offerPath)
  if (!activeOfferSnap.exists()) throw new Error('Offer not found')
  const activeOffer = activeOfferSnap.val() as SwapOffer
  if (activeOffer.status !== 'active') throw new Error('Offer is no longer available')

  const buyerTx = await runTransaction(buyerWalletPath, (currentWallet) => {
    if (!currentWallet) return
    const wallet = currentWallet as UserWallet
    if (wallet.balance < offer.creditPrice) return
    return {
      ...wallet,
      balance: wallet.balance - offer.creditPrice,
      totalSpent: (wallet.totalSpent ?? 0) + offer.creditPrice,
    }
  })
  if (!buyerTx.committed) throw new Error('Insufficient credits')

  const sellerTx = await runTransaction(sellerWalletPath, (currentWallet) => {
    if (!currentWallet) return
    const wallet = currentWallet as UserWallet
    return {
      ...wallet,
      balance: (wallet.balance ?? 0) + sellerReceives,
      totalEarned: (wallet.totalEarned ?? 0) + sellerReceives,
    }
  })
  if (!sellerTx.committed) {
    const revertTx = await runTransaction(buyerWalletPath, (currentWallet) => {
      if (!currentWallet) return
      const wallet = currentWallet as UserWallet
      return {
        ...wallet,
        balance: (wallet.balance ?? 0) + offer.creditPrice,
        totalSpent: Math.max(0, (wallet.totalSpent ?? 0) - offer.creditPrice),
      }
    })
    const revertedBalance = (revertTx.snapshot.val() as UserWallet)?.balance
    if (typeof revertedBalance === 'number') {
      await update(userRef(buyerId, 'profile'), { creditBalance: revertedBalance }).catch(() => {})
    }
    throw new Error('Seller wallet not found')
  }

  const offerTx = await runTransaction(offerPath, (currentOffer) => {
    if (!currentOffer) return
    const offerRecord = currentOffer as SwapOffer
    if (offerRecord.status !== 'active') return
    return {
      ...offerRecord,
      status: 'completed',
      buyerId,
      completedAt: new Date().toISOString(),
    }
  })
  if (!offerTx.committed) {
    // Roll back wallets if offer was already claimed/cancelled.
    const buyerRevert = await runTransaction(buyerWalletPath, (currentWallet) => {
      if (!currentWallet) return
      const wallet = currentWallet as UserWallet
      return {
        ...wallet,
        balance: (wallet.balance ?? 0) + offer.creditPrice,
        totalSpent: Math.max(0, (wallet.totalSpent ?? 0) - offer.creditPrice),
      }
    })
    const sellerRevert = await runTransaction(sellerWalletPath, (currentWallet) => {
      if (!currentWallet) return
      const wallet = currentWallet as UserWallet
      return {
        ...wallet,
        balance: Math.max(0, (wallet.balance ?? 0) - sellerReceives),
        totalEarned: Math.max(0, (wallet.totalEarned ?? 0) - sellerReceives),
      }
    })
    const bBal = (buyerRevert.snapshot.val() as UserWallet)?.balance
    const sBal = (sellerRevert.snapshot.val() as UserWallet)?.balance
    if (typeof bBal === 'number') await update(userRef(buyerId, 'profile'), { creditBalance: bBal }).catch(() => {})
    if (typeof sBal === 'number') await update(userRef(offer.sellerId, 'profile'), { creditBalance: sBal }).catch(() => {})

    throw new Error('Offer is no longer available')
  }

  // Sync profile credit balance for buyer and seller
  const buyerBal = (buyerTx.snapshot.val() as UserWallet)?.balance
  const sellerBal = (sellerTx.snapshot.val() as UserWallet)?.balance
  if (typeof buyerBal === 'number') await update(userRef(buyerId, 'profile'), { creditBalance: buyerBal }).catch(() => {})
  if (typeof sellerBal === 'number') await update(userRef(offer.sellerId, 'profile'), { creditBalance: sellerBal }).catch(() => {})

  // Notify seller.
  const sellerCardRef = push(userRef(offer.sellerId, 'smartCards'))
  await set(sellerCardRef, {
    type: 'swap',
    priority: 'medium',
    title: 'Item Sold!',
    message: `Your ${offer.productName} was purchased for ${offer.creditPrice} credits. You received ${sellerReceives} credits after platform fee.`,
    actions: [{ label: 'View Wallet', type: 'view', href: '/wallet' }],
    timestamp: new Date().toISOString(),
    read: false,
  })

  // Log transaction for both users
  const buyerTxRef = push(userRef(buyerId, 'wallet', 'transactions'))
  await set(buyerTxRef, {
    uid: buyerId, type: 'debit', amount: offer.creditPrice,
    reason: `Bought ${offer.productName} from ${offer.sellerName}`,
    timestamp: new Date().toISOString(),
  })
  const sellerTxRef = push(userRef(offer.sellerId, 'wallet', 'transactions'))
  await set(sellerTxRef, {
    uid: offer.sellerId, type: 'credit', amount: sellerReceives,
    reason: `Sold ${offer.productName} to a community member`,
    timestamp: new Date().toISOString(),
  })
}

export async function cancelSwapOffer(city: string, state: string, offerId: string): Promise<void> {
  if (!rtdb) return
  const key = getCommunityKey(city, state)
  await update(communityRef(key, 'offers', offerId), { status: 'cancelled' })
}

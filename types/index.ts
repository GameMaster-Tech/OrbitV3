// USER PROFILE

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  location: {
    city: string
    state: string
    country: string
  }
  creditBalance: number
  pairingMode?: PairingMode
  buildingId?: string
  clusterId?: string
  pairingDisplayName?: string
  profileVisibility?: ProfileVisibility
  createdAt: Date
  lastActive: Date
}

export type PairingMode = 'private' | 'passive' | 'active' | 'social'
export type ProfileVisibility = 'anonymous' | 'matched' | 'public'

// INVENTORY

export type InventoryTab = 'kitchen' | 'electronics' | 'appliances' | 'documents'

export interface InventoryItem {
  id: string
  productName: string
  category: string
  tab: InventoryTab
  quantity: number
  unit?: string
  price?: number
  purchaseDate?: Date
  barcode?: string
  expiryDate?: Date
  adjustedExpiryDate?: Date
  normalizedName?: string
  isExpiringSoon?: boolean
  shareable?: boolean
  ownerUserId?: string
  zoneId?: string
  notes?: string
  documentDataUrl?: string
  documentMimeType?: string
  documentFileName?: string
  addedAt: Date
  // Electronics & Appliances fields
  brand?: string
  model?: string
  serialNumber?: string
  warrantyExpiry?: Date
  condition?: 'new' | 'good' | 'fair' | 'poor'
  // AI predicted expiry
  orbitPredictedExpiry?: Date
  orbitPredictedConfidence?: 'high' | 'medium' | 'low'
  orbitPredictedReason?: string
}

export interface StorageZone {
  id: string
  name: string
  decayMultiplier: number
  temperature: 'freezer' | 'refrigerator' | 'room' | 'warm'
  humidity: 'low' | 'medium' | 'high'
  itemCount: number
  spoilageCount: number
  createdAt?: Date
}

export interface DecayAdjustment {
  originalExpiry: Date
  adjustedExpiry: Date
  daysAdjusted: number
  reason: string
}

// HEALTH

export interface HealthProfile {
  uid: string
  allergies: string[]
  medications: Medication[]
  conditions: string[]
  dietaryRestrictions: string[]
  updatedAt: Date
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  courseLength: string
  startDate: Date
  endDate?: Date
}

// WALLET & FINANCES

export interface UserWallet {
  uid: string
  balance: number
  totalEarned: number
  totalSpent: number
}

export type ExpenseCategory =
  | 'groceries' | 'healthcare' | 'utilities' | 'electronics'
  | 'entertainment' | 'transport' | 'dining' | 'shopping' | 'other'

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

export interface Expense {
  id: string
  amount: number
  category: ExpenseCategory
  description: string
  date: Date
  sourceItemId?: string  // set when auto-synced from inventory
}

export interface Budget {
  id: string
  category: ExpenseCategory
  limit: number
  period: BudgetPeriod
  spent: number
}

// SMART CARDS

export type SmartCardType =
  | 'expiring' | 'expired' | 'budget' | 'budgetAllocation'
  | 'conflict' | 'healthConflict' | 'oracle' | 'swap'
  | 'deviceService' | 'recipe' | 'pairing' | 'system'

export type SmartCardPriority = 'critical' | 'high' | 'medium' | 'low'

export interface SmartCardAction {
  label: string
  type: 'fix' | 'view' | 'snooze' | 'ignore' | 'confirm'
  href?: string
}

export interface SmartCardData {
  id: string
  type: SmartCardType
  priority: SmartCardPriority
  title: string
  message: string
  itemId?: string
  actions: SmartCardAction[]
  timestamp: Date
  read?: boolean
}

// ACTIVITY LOG

export interface ActivityLog {
  id: string
  type: 'add' | 'remove' | 'update' | 'zone' | 'swap' | 'ai' | 'system'
  message: string
  itemId?: string
  timestamp: Date
}

// SWAPSYNC

export interface SwapOffer {
  id: string
  itemId: string
  sellerId: string
  sellerName: string
  sellerCity: string
  sellerState: string
  productName: string
  category: string
  quantity: number
  creditPrice: number
  expiryDate?: Date
  description: string
  communityCity: string
  communityState: string
  status: 'active' | 'completed' | 'cancelled'
  createdAt?: Date
}

export interface CreditTransaction {
  id: string
  uid: string
  type: 'credit' | 'debit'
  amount: number
  reason: string
  timestamp: Date
}

export interface PantryItem {
  id: string
  name: string
  normalizedName: string
  quantity: number
  unit?: string
  expiryDate?: Date
  isExpiringSoon: boolean
  shareable: boolean
  ownerUserId: string
}

export type SmartPairMatchStatus =
  | 'candidate'
  | 'notified'
  | 'viewed'
  | 'swap_requested'
  | 'swap_accepted'
  | 'cook_requested'
  | 'cook_accepted'
  | 'declined'
  | 'expired'

export type SmartPairAction = 'unlock_recipe' | 'request_swap' | 'cook_together'

export interface SmartPairRecipeOpportunity {
  recipeName: string
  estimatedTimeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredientsUsed: string[]
  missingIngredients: string[]
  confidenceScore: number
}

export interface SmartPairSuggestion {
  recipeName: string
  confidenceScore: number
  missingIngredients: string[]
  yourIngredients: string[]
  nearbyComplementaryIngredients: string[]
  nearbyLabel: string
  actions: SmartPairAction[]
  estimatedTimeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  mealViabilityScore: number
  expiryUrgencyScore: number
  socialFrictionScore: number
}

export interface SmartPairFallback {
  title: string
  body: string
  substitutions: string[]
  soloSuggestions: string[]
}

export interface SmartPairMatch {
  id: string
  userAId: string
  userBId: string
  status: SmartPairMatchStatus
  recipeName: string
  recipeId?: string | null
  confidenceScore: number
  expiryUrgencyScore: number
  mealViabilityScore: number
  socialFrictionScore: number
  yourIngredients: string[]
  nearbyComplementaryIngredients: string[]
  missingIngredients: string[]
  nearbyLabel: string
  actions: SmartPairAction[]
  estimatedTimeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  mutualOptInRevealed: boolean
  counterpartDisplayName?: string
  createdAt: Date
  expiresAt: Date
  updatedAt?: Date
  lastNotificationAt?: Date
}

export interface SwapRequest {
  id: string
  matchId: string
  requestingUserId: string
  requestedItemNames: string[]
  offeredItemNames: string[]
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: Date
  updatedAt: Date
  respondedAt?: Date
}

export interface NearbyPairingUser {
  uid: string
  pairingMode: PairingMode
  profileVisibility: ProfileVisibility
  locationScope: 'building' | 'cluster' | 'radius'
  pantryItems: PantryItem[]
  dietaryRestrictions: string[]
}

// Flavor Lab
export interface GetFlavoredPreferences {
  cuisineStyle: string
  flavorMood: string
  maxCookTime: number
}

export interface LibraryRecipe {
  id: string
  title: string
  description: string
  cookTimeMinutes: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: string[]
  steps: string[]
  funTip: string
  expiringItemsUsed: string[]
  preferenceSnapshot: GetFlavoredPreferences
  generatedAt: Date
  favorite: boolean
  cooked: boolean
}

export interface GetFlavoredResponse {
  recipes: Array<{
    title: string
    description: string
    cookTimeMinutes: number
    servings: number
    difficulty: 'easy' | 'medium' | 'hard'
    ingredients: string[]
    steps: string[]
    funTip: string
    expiringItemsUsed: string[]
  }>
  summary: string
}

// AI RESPONSES

export interface VisionProductResponse {
  productName: string
  expiryDate: string | null
  category: string
  confidence: number
  barcode?: string | null
}

export interface VisionPrescriptionResponse {
  medications: { name: string; dosage: string; frequency: string }[]
  courseLength: string
  startDate: string | null
  confidence: number
}

export interface AudioDiagnosticResponse {
  healthScore: number
  anomalies: string[]
  recommendation: string
  noiseProfile: string
}

export interface RecipeResponse {
  recipes: {
    name: string
    description: string
    cookTime: string
    ingredients: string[]
    steps: string[]
    servings: number
  }[]
  expiringItemsUsed: string[]
}

export interface OracleResponse {
  insights: {
    title: string
    description: string
    priority: SmartCardPriority
    actionable: boolean
    action?: string
  }[]
}


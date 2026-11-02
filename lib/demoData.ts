export type DemoInventoryItem = {
  id: string
  productName: string
  category: string
  quantity: number
  unit: string
  expiryDate: string
  note: string
}

export type OrbitDemoState = {
  inventory: DemoInventoryItem[]
  recipeSaved: boolean
  marketplaceInterest: boolean
  serviceRequestOpen: boolean
  sharedUpdate: boolean
}

function isoDaysFromNow(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export const orbitDemoSteps = [
  ['Smart household dashboard', 'Review a live household with expiry, budget, and warranty signals already connected.'],
  ['Pantry vision', 'Inspect a prepared pantry scan and add the recognised products to the active inventory.'],
  ['Smart expiry', 'See which items need action today and why.'],
  ['Live AI recipe engine', 'Generate a zero-waste recipe from the same expiring inventory using Orbit’s configured AI route.'],
  ['Shared household', 'Record a pantry update that remains visible throughout the walkthrough.'],
  ['SwapSync', 'Express interest in a nearby rescue listing.'],
  ['Warranty and service', 'Create a service request for a connected household asset.'],
  ['Orbit recommendations', 'See actions derived from the same sample household state.'],
] as const

export function createOrbitDemoState(): OrbitDemoState {
  return {
    inventory: [
      { id: 'demo-spinach', productName: 'Baby spinach', category: 'produce', quantity: 250, unit: 'g', expiryDate: isoDaysFromNow(0), note: 'Use today' },
      { id: 'demo-tomatoes', productName: 'Cherry tomatoes', category: 'produce', quantity: 500, unit: 'g', expiryDate: isoDaysFromNow(1), note: 'Recipe priority' },
      { id: 'demo-milk', productName: 'A2 milk', category: 'dairy', quantity: 1, unit: 'L', expiryDate: isoDaysFromNow(2), note: 'Plan breakfast' },
      { id: 'demo-yogurt', productName: 'Greek yogurt', category: 'dairy', quantity: 400, unit: 'g', expiryDate: isoDaysFromNow(-1), note: 'Eligible for disposal review' },
      { id: 'demo-pasta', productName: 'Penne pasta', category: 'pantry', quantity: 2, unit: 'packs', expiryDate: isoDaysFromNow(120), note: 'Recipe staple' },
      { id: 'demo-air-purifier', productName: 'Air purifier', category: 'electronics', quantity: 1, unit: 'unit', expiryDate: isoDaysFromNow(365), note: 'Warranty ends in 104 days' },
    ],
    recipeSaved: false,
    marketplaceInterest: false,
    serviceRequestOpen: false,
    sharedUpdate: false,
  }
}

export function daysUntilDemoExpiry(value: string, now = new Date()): number {
  return Math.ceil((new Date(value).getTime() - now.getTime()) / 86_400_000)
}

import type { PantryItem, SmartPairRecipeOpportunity } from '@/types'
import { normalizeIngredientName } from './utils'

export interface MealOpportunity extends SmartPairRecipeOpportunity {
  recipeId: string
  usedFromA: string[]
  usedFromB: string[]
  tags: string[]
}

export interface MealOpportunityInput {
  userAItems: PantryItem[]
  userBItems: PantryItem[]
}

export interface RecipeSuggestionService {
  generateMealOpportunity(input: MealOpportunityInput): Promise<MealOpportunity | null>
}

type RecipeTemplate = {
  id: string
  recipeName: string
  estimatedTimeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  // Each group requires at least one ingredient match.
  coreGroups: string[][]
  optionalGroups?: string[][]
  tags: string[]
}

const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    id: 'fried_rice',
    recipeName: 'Quick Fried Rice Bowl',
    estimatedTimeMinutes: 20,
    difficulty: 'easy',
    coreGroups: [
      ['rice'],
      ['egg', 'tofu', 'chicken'],
      ['onion', 'carrot', 'peas', 'bell pepper', 'capsicum'],
      ['soy sauce', 'garlic'],
    ],
    optionalGroups: [['spring onion', 'sesame', 'chili']],
    tags: ['asian', 'one-pan'],
  },
  {
    id: 'tomato_omelette_toast',
    recipeName: 'Masala Tomato Omelette Toast',
    estimatedTimeMinutes: 15,
    difficulty: 'easy',
    coreGroups: [
      ['egg'],
      ['tomato', 'onion'],
      ['bread', 'toast', 'bun'],
    ],
    optionalGroups: [['chili', 'coriander', 'cheese']],
    tags: ['breakfast', 'vegetarian-friendly'],
  },
  {
    id: 'pasta_arrabbiata',
    recipeName: 'Simple Arrabbiata Pasta',
    estimatedTimeMinutes: 25,
    difficulty: 'easy',
    coreGroups: [
      ['pasta', 'spaghetti', 'penne', 'macaroni'],
      ['tomato', 'tomato puree'],
      ['garlic', 'onion'],
      ['chili', 'red chili flakes', 'pepper'],
    ],
    optionalGroups: [['basil', 'parmesan', 'olive oil']],
    tags: ['italian', 'vegetarian-friendly'],
  },
  {
    id: 'chickpea_salad',
    recipeName: 'Herby Chickpea Salad Bowl',
    estimatedTimeMinutes: 15,
    difficulty: 'easy',
    coreGroups: [
      ['chickpea', 'beans', 'rajma'],
      ['cucumber', 'tomato', 'onion'],
      ['lemon', 'lime', 'vinegar'],
    ],
    optionalGroups: [['olive oil', 'mint', 'coriander']],
    tags: ['salad', 'vegan'],
  },
  {
    id: 'lentil_soup',
    recipeName: 'Weeknight Lentil Soup',
    estimatedTimeMinutes: 30,
    difficulty: 'medium',
    coreGroups: [
      ['lentil', 'dal', 'masoor', 'moong'],
      ['onion', 'garlic'],
      ['tomato', 'carrot', 'celery'],
    ],
    optionalGroups: [['spinach', 'cumin', 'paprika']],
    tags: ['comfort', 'vegetarian-friendly'],
  },
  {
    id: 'stir_fry_noodles',
    recipeName: 'Savory Stir-Fry Noodles',
    estimatedTimeMinutes: 22,
    difficulty: 'medium',
    coreGroups: [
      ['noodles'],
      ['chicken', 'tofu', 'egg'],
      ['onion', 'carrot', 'bell pepper', 'cabbage'],
      ['soy sauce', 'garlic', 'ginger'],
    ],
    optionalGroups: [['spring onion', 'sesame', 'chili']],
    tags: ['asian', 'one-pan'],
  },
]

function setFromItems(items: PantryItem[]): Set<string> {
  const values = new Set<string>()
  for (const item of items) {
    const normalized = normalizeIngredientName(item.normalizedName || item.name)
    if (!normalized) continue
    values.add(normalized)

    const chunks = normalized.split(' ')
    if (chunks.length > 1) {
      values.add(chunks.slice(0, 2).join(' '))
      values.add(chunks[chunks.length - 1])
    }
  }
  return values
}

function groupMatch(group: string[], setA: Set<string>, setB: Set<string>) {
  const normalizedGroup = group.map(normalizeIngredientName).filter(Boolean)

  for (const key of normalizedGroup) {
    const matchedA = Array.from(setA).some((value) => value.includes(key) || key.includes(value))
    const matchedB = Array.from(setB).some((value) => value.includes(key) || key.includes(value))
    if (matchedA || matchedB) {
      return {
        matched: true,
        inA: matchedA,
        inB: matchedB,
        alias: key,
      }
    }
  }

  return {
    matched: false,
    inA: false,
    inB: false,
    alias: normalizedGroup[0] ?? '',
  }
}

function safeScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

class LocalRecipeSuggestionService implements RecipeSuggestionService {
  async generateMealOpportunity(input: MealOpportunityInput): Promise<MealOpportunity | null> {
    const setA = setFromItems(input.userAItems)
    const setB = setFromItems(input.userBItems)

    let best: MealOpportunity | null = null

    for (const template of RECIPE_TEMPLATES) {
      const matchedAliases: string[] = []
      const missing: string[] = []
      let coreMatches = 0
      let contributesA = 0
      let contributesB = 0

      for (const group of template.coreGroups) {
        const match = groupMatch(group, setA, setB)
        if (!match.matched) {
          missing.push(group[0])
          continue
        }
        coreMatches += 1
        matchedAliases.push(match.alias)
        if (match.inA) contributesA += 1
        if (match.inB) contributesB += 1
      }

      // We only keep pair opportunities where both users contribute.
      if (contributesA === 0 || contributesB === 0) continue

      const coverage = coreMatches / template.coreGroups.length
      if (coverage < 0.75) continue
      if (missing.length > 1) continue

      const optionalBoost = (template.optionalGroups ?? []).reduce((acc, group) => {
        const optionalMatch = groupMatch(group, setA, setB)
        return acc + (optionalMatch.matched ? 0.06 : 0)
      }, 0)

      const rawConfidence = (coverage * 72) + (Math.min(contributesA, contributesB) * 8) + (optionalBoost * 100) - (missing.length * 10)
      const confidenceScore = safeScore(rawConfidence)
      if (confidenceScore < 70) continue

      const opportunity: MealOpportunity = {
        recipeId: template.id,
        recipeName: template.recipeName,
        estimatedTimeMinutes: template.estimatedTimeMinutes,
        difficulty: template.difficulty,
        ingredientsUsed: matchedAliases,
        missingIngredients: missing,
        confidenceScore,
        usedFromA: matchedAliases.filter((name) => Array.from(setA).some((value) => value.includes(name) || name.includes(value))),
        usedFromB: matchedAliases.filter((name) => Array.from(setB).some((value) => value.includes(name) || name.includes(value))),
        tags: template.tags,
      }

      if (!best || opportunity.confidenceScore > best.confidenceScore) {
        best = opportunity
      }
    }

    return best
  }
}

export const recipeSuggestionService: RecipeSuggestionService = new LocalRecipeSuggestionService()

export async function generateMealOpportunity(input: MealOpportunityInput): Promise<MealOpportunity | null> {
  return recipeSuggestionService.generateMealOpportunity(input)
}


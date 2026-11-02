'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addLibraryRecipe,
  deleteLibraryRecipe,
  listenLibraryRecipes,
  setLibraryRecipeCooked,
  setLibraryRecipeFavorite,
} from '@/lib/database'
import type { GetFlavoredPreferences, InventoryItem, LibraryRecipe } from '@/types'

export type GeneratedFlavorRecipe = {
  title: string
  description: string
  cookTimeMinutes: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: string[]
  steps: string[]
  funTip: string
  expiringItemsUsed: string[]
}

export function useFlavorLibrary(uid: string | undefined) {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([])

  useEffect(() => {
    if (!uid) return
    const unsub = listenLibraryRecipes(uid, setRecipes)
    return () => unsub()
  }, [uid])

  const saveGeneratedRecipes = useCallback(
    async (generatedRecipes: GeneratedFlavorRecipe[], preferences: GetFlavoredPreferences) => {
      if (!uid || generatedRecipes.length === 0) return
      await Promise.all(
        generatedRecipes.map((recipe) =>
          addLibraryRecipe(uid, {
            ...recipe,
            preferenceSnapshot: preferences,
          })
        )
      )
    },
    [uid]
  )

  const toggleFavorite = useCallback(
    async (recipeId: string, favorite: boolean) => {
      if (!uid) return
      await setLibraryRecipeFavorite(uid, recipeId, favorite)
    },
    [uid]
  )

  const toggleCooked = useCallback(
    async (recipeId: string, cooked: boolean) => {
      if (!uid) return
      await setLibraryRecipeCooked(uid, recipeId, cooked)
    },
    [uid]
  )

  const removeRecipe = useCallback(
    async (recipeId: string) => {
      if (!uid) return
      await deleteLibraryRecipe(uid, recipeId)
    },
    [uid]
  )

  return {
    recipes: uid ? recipes : [],
    saveGeneratedRecipes,
    toggleFavorite,
    toggleCooked,
    removeRecipe,
  }
}

export function getPantryMatch(recipe: LibraryRecipe, inventory: InventoryItem[]): {
  matchScore: number
  missingIngredients: string[]
} {
  const pantryNames = inventory.map((item) => item.productName.toLowerCase())
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()

  const missingIngredients = recipe.ingredients.filter((ingredient) => {
    const normalizedIngredient = normalize(ingredient)
    return !pantryNames.some((name) => {
      const normalizedName = normalize(name)
      return (
        normalizedIngredient.includes(normalizedName) ||
        normalizedName.includes(normalizedIngredient)
      )
    })
  })

  const matchScore = recipe.ingredients.length
    ? Math.max(0, Math.round(((recipe.ingredients.length - missingIngredients.length) / recipe.ingredients.length) * 100))
    : 0

  return { matchScore, missingIngredients }
}

export function useLibraryStats(recipes: LibraryRecipe[]) {
  return useMemo(() => {
    const favorites = recipes.filter((recipe) => recipe.favorite).length
    const cooked = recipes.filter((recipe) => recipe.cooked).length
    return { total: recipes.length, favorites, cooked }
  }, [recipes])
}

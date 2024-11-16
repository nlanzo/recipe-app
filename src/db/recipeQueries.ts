import {
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable,
  unitsTable,
  imagesTable,
} from "./schema"
import { db } from "./index"
import { eq } from "drizzle-orm"

// Fetch a recipe with its ingredients and units
export async function getRecipeWithIngredients(recipeId: number) {
  const recipeWithIngredients = await db
    .select()
    .from(recipesTable)
    .leftJoin(
      recipeIngredientsTable,
      eq(recipeIngredientsTable.recipeId, recipesTable.id)
    )
    .leftJoin(
      ingredientsTable,
      eq(ingredientsTable.id, recipeIngredientsTable.ingredientId)
    )
    .leftJoin(unitsTable, eq(unitsTable.id, recipeIngredientsTable.unitId))
    .where(eq(recipesTable.id, recipeId))

  return recipeWithIngredients
}

export async function getRecipeWithImages(recipeId: number) {
  const recipeWithImages = await db
    .select()
    .from(recipesTable)
    .leftJoin(imagesTable, eq(imagesTable.recipeId, recipesTable.id))
    .where(eq(recipesTable.id, recipeId))

  return recipeWithImages
}

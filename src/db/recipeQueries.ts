import {
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable,
  unitsTable,
  imagesTable,
  usersTable,
  categoriesTable,
  recipeCategoriesTable,
} from "./schema"
import { db } from "./index"
import { eq, min } from "drizzle-orm"

export async function getRecipeCardData() {
  const recipes = await db
    .select({
      id: recipesTable.id,
      title: recipesTable.title,
      imageUrl: imagesTable.imageUrl,
      totalTimeInMinutes: recipesTable.totalTimeInMinutes,
      numberOfServings: recipesTable.numberOfServings,
    })
    .from(recipesTable)
    .leftJoin(imagesTable, eq(imagesTable.recipeId, recipesTable.id))
    .where(eq(imagesTable.isPrimary, true || min(imagesTable.id))) // Fetch only the primary image
    .execute()

  return recipes
}

// fetch a single recipe by id.  include the recipe's title, author, description, instructions, activeTimeInMinutes, totalTimeInMinutes, numberOfServings, created_at, and updated_at.  include ingredient names, quantities, and units.  Also include the recipe's image URLs. This query is used to populate the RecipeDetails page.
export async function getRecipeById(id: number) {
  // Fetch the main recipe details
  const recipe = await db
    .select({
      title: recipesTable.title,
      author: usersTable.username,
      description: recipesTable.description,
      instructions: recipesTable.instructions,
      activeTimeInMinutes: recipesTable.activeTimeInMinutes,
      totalTimeInMinutes: recipesTable.totalTimeInMinutes,
      numberOfServings: recipesTable.numberOfServings,
      createdAt: recipesTable.created_at,
      updatedAt: recipesTable.updated_at,
    })
    .from(recipesTable)
    .leftJoin(usersTable, eq(usersTable.id, recipesTable.userId))
    .where(eq(recipesTable.id, id))
    .execute()

  // Fetch the ingredients for the recipe
  const ingredients = await db
    .select({
      name: ingredientsTable.name,
      quantity: recipeIngredientsTable.quantity,
      unit: unitsTable.name,
    })
    .from(recipeIngredientsTable)
    .leftJoin(
      ingredientsTable,
      eq(ingredientsTable.id, recipeIngredientsTable.ingredientId)
    )
    .leftJoin(unitsTable, eq(unitsTable.id, recipeIngredientsTable.unitId))
    .where(eq(recipeIngredientsTable.recipeId, id))
    .execute()

  // Fetch the images for the recipe
  const images = await db
    .select({
      imageUrl: imagesTable.imageUrl,
      altText: imagesTable.altText,
    })
    .from(imagesTable)
    .where(eq(imagesTable.recipeId, id))
    .execute()

  // Fetch the categories for the recipe
  const categories = await db
    .select({
      name: categoriesTable.name,
    })
    .from(recipeCategoriesTable)
    .leftJoin(
      categoriesTable,
      eq(categoriesTable.id, recipeCategoriesTable.categoryId)
    )
    .where(eq(recipeCategoriesTable.recipeId, id))
    .execute()

  // Combine the results into a single object
  const recipeDetails = {
    ...recipe[0], // Assuming the recipe query returns an array with a single object
    categories,
    ingredients,
    images,
  }

  return recipeDetails
}

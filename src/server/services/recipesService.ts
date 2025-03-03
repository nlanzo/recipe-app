import {
  recipesTable,
  recipeCategoriesTable,
  categoriesTable,
  recipeIngredientsTable,
  ingredientsTable,
  unitsTable,
  imagesTable,
  usersTable,
} from "../../db/schema.js"
import { db } from "../../db/index.js"
import { eq } from "drizzle-orm"

interface Ingredient {
  name: string
  quantity: number
  unit: string
  abbreviation: string
}

interface Image {
  imageUrl: string
  altText: string
}

interface RecipeInput {
  title: string
  categories: string[]
  description: string
  instructions: string
  userId: number
  activeTimeInMinutes: number
  totalTimeInMinutes: number
  numberOfServings: number
  createdAt: Date
  ingredients: Ingredient[]
  images: Image[]
}

// Function to add a new recipe with the specified details
export async function addRecipe({
  title,
  categories,
  description,
  instructions,
  userId,
  activeTimeInMinutes,
  totalTimeInMinutes,
  numberOfServings,
  createdAt,
  ingredients,
  images,
}: RecipeInput) {
  // Start a transaction to ensure all related data is inserted together
  await db.transaction(async (trx) => {
    // Ensure the author exists
    const author = await trx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
    if (author.length === 0) throw new Error("Author not found")

    // Insert the recipe
    const [newRecipe] = await trx
      .insert(recipesTable)
      .values({
        userId,
        title,
        description,
        instructions,
        activeTimeInMinutes,
        totalTimeInMinutes,
        numberOfServings,
        created_at: createdAt,
      })
      .returning()

    // Insert categories and associate them with the recipe
    for (const categoryName of categories) {
      // Check if category exists, otherwise insert it
      const [existingCategory] = await trx
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, categoryName))
        .limit(1)
      const categoryId = existingCategory
        ? existingCategory.id
        : (
            await trx
              .insert(categoriesTable)
              .values({ name: categoryName })
              .returning()
          )[0].id

      // Link category to the recipe in the recipeCategoriesTable
      await trx.insert(recipeCategoriesTable).values({
        recipeId: newRecipe.id,
        categoryId,
      })
    }

    // Insert ingredients and associate them with the recipe
    for (const { name, quantity, unit, abbreviation } of ingredients) {
      // Check if ingredient exists, otherwise insert it
      const [existingIngredient] = await trx
        .select()
        .from(ingredientsTable)
        .where(eq(ingredientsTable.name, name))
        .limit(1)
      const ingredientId = existingIngredient
        ? existingIngredient.id
        : (await trx.insert(ingredientsTable).values({ name }).returning())[0]
            .id

      // Check if unit exists, otherwise insert it
      const [existingUnit] = await trx
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.name, unit))
        .limit(1)
      const unitId = existingUnit
        ? existingUnit.id
        : (
            await trx
              .insert(unitsTable)
              .values({ name: unit, abbreviation })
              .returning()
          )[0].id

      // Link ingredient to the recipe in the recipeIngredientsTable with quantity and unit
      await trx.insert(recipeIngredientsTable).values({
        recipeId: newRecipe.id,
        ingredientId,
        quantity: quantity.toString(),
        unitId,
      })
    }

    // Insert images and associate them with the recipe
    for (const { imageUrl, altText } of images) {
      await trx.insert(imagesTable).values({
        recipeId: newRecipe.id,
        imageUrl,
        altText,
      })
    }
  })
}

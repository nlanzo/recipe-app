// testQueries.ts
import { getRecipeCardData, getRecipeById } from "./recipeQueries"

async function testQueries() {
  try {
    // Test getRecipeCardData
    const recipeCardData = await getRecipeCardData()
    console.log("Recipe Card Data:", JSON.stringify(recipeCardData, null, 2))

    // Test getRecipeById
    const recipeById = await getRecipeById(1) // Replace with a valid recipe ID
    console.log("Recipe by ID:", JSON.stringify(recipeById, null, 2))
  } catch (error) {
    console.error("Error testing queries:", error)
  }
}

testQueries()

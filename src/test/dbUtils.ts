import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { eq } from "drizzle-orm"
import { Pool } from "pg"
import dotenv from "dotenv"
import * as schema from "../db/schema"

// Load test environment variables
dotenv.config({ path: ".env.test" })

// Database URL for testing
const testDatabaseUrl = process.env.DATABASE_URL

if (!testDatabaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set in test environment"
  )
}

// Create a test database pool
const testPool = new Pool({
  connectionString: testDatabaseUrl,
  ssl: false, // Typically false for local testing
})

// Create a Drizzle instance with the test connection pool
export const testDb = drizzle(testPool, { schema })

// Fixture data for testing
const testUsers = [
  {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    password: "$2b$10$Xe9MJUrQSCdlwLkM2v4pFuyVeQJ1hBqyivV/zYX0PgP6oALnlDwUi", // hashed 'password123'
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    username: "admin",
    email: "admin@example.com",
    password: "$2b$10$Xe9MJUrQSCdlwLkM2v4pFuyVeQJ1hBqyivV/zYX0PgP6oALnlDwUi", // hashed 'password123'
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const testCategories = [
  { id: 1, name: "Italian" },
  { id: 2, name: "Vegetarian" },
  { id: 3, name: "Dinner" },
]

const testUnits = [
  { id: 1, name: "g" },
  { id: 2, name: "tbsp" },
  { id: 3, name: "cup" },
]

const testIngredients = [
  { id: 1, name: "Pasta" },
  { id: 2, name: "Tomato" },
  { id: 3, name: "Cheese" },
]

const testRecipes = [
  {
    id: 1,
    title: "Test Pasta",
    description: "A test pasta recipe",
    instructions: "Cook the pasta. Add sauce.",
    activeTimeInMinutes: 15,
    totalTimeInMinutes: 30,
    numberOfServings: 4,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const testRecipeIngredients = [
  { recipeId: 1, ingredientId: 1, unitId: 3, quantity: "2" },
  { recipeId: 1, ingredientId: 2, unitId: 2, quantity: "3" },
  { recipeId: 1, ingredientId: 3, unitId: 1, quantity: "100" },
]

const testRecipeCategories = [
  { recipeId: 1, categoryId: 1 },
  { recipeId: 1, categoryId: 3 },
]

const testImages = [
  {
    recipeId: 1,
    imageUrl: "https://example.com/test-image.jpg",
    altText: "Test Pasta",
    isPrimary: true,
  },
]

// Setup test database with seed data
export async function setupTestDatabase() {
  try {
    console.log("Setting up test database...")

    // Run migrations
    await migrate(testDb, { migrationsFolder: "./drizzle" })

    // Clear existing data
    await clearDatabase()

    // Insert test data
    await testDb.insert(schema.usersTable).values(testUsers)
    await testDb.insert(schema.categoriesTable).values(testCategories)
    await testDb.insert(schema.unitsTable).values(testUnits)
    await testDb.insert(schema.ingredientsTable).values(testIngredients)
    await testDb.insert(schema.recipesTable).values(testRecipes)
    await testDb
      .insert(schema.recipeIngredientsTable)
      .values(testRecipeIngredients)
    await testDb
      .insert(schema.recipeCategoriesTable)
      .values(testRecipeCategories)
    await testDb.insert(schema.imagesTable).values(testImages)

    console.log("Test database setup completed")
  } catch (error) {
    console.error("Error setting up test database:", error)
    throw error
  }
}

// Clear all data from test database
export async function clearDatabase() {
  try {
    console.log("Clearing test database...")

    // Delete in the correct order to respect foreign key constraints
    await testDb.delete(schema.imagesTable)
    await testDb.delete(schema.recipeIngredientsTable)
    await testDb.delete(schema.recipeCategoriesTable)
    await testDb.delete(schema.savedRecipesTable)
    await testDb.delete(schema.recipesTable)
    await testDb.delete(schema.ingredientsTable)
    await testDb.delete(schema.unitsTable)
    await testDb.delete(schema.categoriesTable)
    await testDb.delete(schema.usersTable)

    console.log("Test database cleared")
  } catch (error) {
    console.error("Error clearing test database:", error)
    throw error
  }
}

// Tear down test database
export async function teardownTestDatabase() {
  try {
    console.log("Tearing down test database...")

    // Clear data
    await clearDatabase()

    // Close the pool
    await testPool.end()

    console.log("Test database teardown completed")
  } catch (error) {
    console.error("Error tearing down test database:", error)
    throw error
  }
}

// Generate a test JWT token
export function generateTestToken(
  userId: number,
  isAdmin: boolean = false
): string {
  // This is a simplified example. In a real implementation, you would use jwt.sign
  return `test_token_for_user_${userId}${isAdmin ? "_admin" : ""}`
}

// Helper to get a test user's data
export async function getTestUser(id: number) {
  const user = await testDb
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, id))
  return user[0]
}

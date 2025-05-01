import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { eq } from "drizzle-orm"
import pg from "pg"
import dotenv from "dotenv"
import * as schema from "../db/schema"

// Load test environment variables
dotenv.config({ path: ".env.test" })

// Get PostgreSQL Pool from pg
const { Pool } = pg

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
    password_hash:
      "$2b$10$Xe9MJUrQSCdlwLkM2v4pFuyVeQJ1hBqyivV/zYX0PgP6oALnlDwUi", // hashed 'password123'
    reset_token_hash: null,
    reset_token_expiry: null,
    is_admin: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 2,
    username: "admin",
    email: "admin@example.com",
    password_hash:
      "$2b$10$Xe9MJUrQSCdlwLkM2v4pFuyVeQJ1hBqyivV/zYX0PgP6oALnlDwUi", // hashed 'password123'
    reset_token_hash: null,
    reset_token_expiry: null,
    is_admin: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
]

const testCategories = [
  { id: 1, name: "Italian" },
  { id: 2, name: "Vegetarian" },
  { id: 3, name: "Dinner" },
]

const testUnits = [
  { id: 1, name: "g", abbreviation: "g" },
  { id: 2, name: "tablespoon", abbreviation: "tbsp" },
  { id: 3, name: "cup", abbreviation: "cup" },
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
    try {
      console.log("Running database migrations...")
      await migrate(testDb, { migrationsFolder: "./drizzle" })
      console.log("Migrations completed successfully")
    } catch (error) {
      console.error("Error running migrations:", error)
      console.log(
        "Continuing with setup - migration errors may be due to schema already existing"
      )
    }

    // Clear existing data
    await clearDatabase()

    // Insert test data
    console.log("Inserting test data...")

    // Insert users
    for (const user of testUsers) {
      await testDb.insert(schema.usersTable).values({
        id: user.id,
        username: user.username,
        email: user.email,
        passwordHash: user.password_hash,
        resetTokenHash: user.reset_token_hash,
        resetTokenExpiry: user.reset_token_expiry,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })
    }

    // Insert units
    for (const unit of testUnits) {
      await testDb.insert(schema.unitsTable).values({
        id: unit.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
      })
    }

    // Insert categories
    for (const category of testCategories) {
      await testDb.insert(schema.categoriesTable).values({
        id: category.id,
        name: category.name,
      })
    }

    // Insert ingredients
    for (const ingredient of testIngredients) {
      await testDb.insert(schema.ingredientsTable).values({
        id: ingredient.id,
        name: ingredient.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Insert recipes
    for (const recipe of testRecipes) {
      await testDb.insert(schema.recipesTable).values({
        id: recipe.id,
        userId: recipe.userId,
        title: recipe.title,
        description: recipe.description,
        instructions: recipe.instructions,
        activeTimeInMinutes: recipe.activeTimeInMinutes,
        totalTimeInMinutes: recipe.totalTimeInMinutes,
        numberOfServings: recipe.numberOfServings,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      })
    }

    // Insert recipe ingredients
    for (const ri of testRecipeIngredients) {
      await testDb.insert(schema.recipeIngredientsTable).values({
        recipeId: ri.recipeId,
        ingredientId: ri.ingredientId,
        unitId: ri.unitId,
        quantity: ri.quantity,
      })
    }

    // Insert recipe categories
    for (const rc of testRecipeCategories) {
      await testDb.insert(schema.recipeCategoriesTable).values({
        recipeId: rc.recipeId,
        categoryId: rc.categoryId,
      })
    }

    // Insert images
    for (const image of testImages) {
      await testDb.insert(schema.imagesTable).values({
        recipeId: image.recipeId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        isPrimary: image.isPrimary,
      })
    }

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

    // Temporarily disable foreign key constraints for cleaner deletion
    await testDb.execute("SET CONSTRAINTS ALL DEFERRED")

    try {
      // Delete in the correct order (from most dependent to least dependent)
      await testDb.delete(schema.imagesTable)
      await testDb.delete(schema.recipeIngredientsTable)
      await testDb.delete(schema.recipeCategoriesTable)
      await testDb.delete(schema.savedRecipesTable)
      await testDb.delete(schema.recipesTable)
      await testDb.delete(schema.ingredientsTable)
      await testDb.delete(schema.unitsTable)
      await testDb.delete(schema.categoriesTable)
      await testDb.delete(schema.refreshTokensTable)
      await testDb.delete(schema.usersTable)
    } catch (error) {
      console.warn("Warning during database cleanup:", error)
      // Continue with cleanup even if there's an error
    } finally {
      // Re-enable foreign key constraints
      await testDb.execute("SET CONSTRAINTS ALL IMMEDIATE")
    }

    console.log("Test database cleared")
  } catch (error) {
    console.error("Error clearing test database:", error)
    // Don't throw the error, as it would stop test execution
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

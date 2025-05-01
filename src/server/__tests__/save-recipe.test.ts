import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import supertest from "supertest"
import express, { Request, Response, NextFunction } from "express"
import {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestToken,
  clearDatabase,
} from "../../test/dbUtils"
import { db } from "../../db"
import { savedRecipesTable } from "../../db/schema"
import { and, eq } from "drizzle-orm"

// Import middleware
import { AuthRequest, authenticateToken } from "../middleware/auth"

// Mock JWT verification for tests
import { vi } from "vitest"
vi.mock("../middleware/auth", () => {
  return {
    AuthRequest: vi.fn(),
    authenticateToken: (req: Request, res: Response, next: NextFunction) => {
      // Extract token from Authorization header
      const authHeader = req.headers["authorization"]
      const token = authHeader && authHeader.split(" ")[1]

      if (!token) {
        return res.status(401).json({ error: "Authentication required" })
      }

      // For testing purposes, decode our simplified test token format
      // Format is "test_token_for_user_{userId}[_admin]"
      const userId = parseInt(token.split("_")[4])

      if (isNaN(userId)) {
        return res.status(403).json({ error: "Invalid token" })
      }

      // Set user info in request
      ;(req as AuthRequest).user = { userId }
      next()
    },
  }
})

// Create a test server that mimics the actual application
const app = express()
app.use(express.json())

// Implement endpoints for saving and unsaving recipes
app.post(
  "/api/recipes/:id/save",
  authenticateToken,
  async (req: AuthRequest, res) => {
    const recipeId = parseInt(req.params.id)
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      await db.insert(savedRecipesTable).values({
        recipeId,
        userId,
      })
      res.status(200).json({ message: "Recipe saved successfully" })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save recipe"
      res.status(500).json({ error: errorMessage })
    }
  }
)

app.delete(
  "/api/recipes/:id/save",
  authenticateToken,
  async (req: AuthRequest, res) => {
    const recipeId = parseInt(req.params.id)
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      await db
        .delete(savedRecipesTable)
        .where(
          and(
            eq(savedRecipesTable.userId, userId),
            eq(savedRecipesTable.recipeId, recipeId)
          )
        )
      res.status(200).json({ message: "Recipe unsaved successfully" })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to unsave recipe"
      res.status(500).json({ error: errorMessage })
    }
  }
)

app.get(
  "/api/user/saved-recipes",
  authenticateToken,
  async (req: AuthRequest, res) => {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      const savedRecipes = await db
        .select({
          id: savedRecipesTable.recipeId,
        })
        .from(savedRecipesTable)
        .where(eq(savedRecipesTable.userId, userId))

      res.json(savedRecipes)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch saved recipes"
      res.status(500).json({ error: errorMessage })
    }
  }
)

describe("Save Recipe API Integration Tests", () => {
  let request: ReturnType<typeof supertest>
  const testToken = generateTestToken(1)

  beforeAll(async () => {
    // Set up test database with fixture data
    await setupTestDatabase()
    request = supertest(app)
  })

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    // Clear database before each test to ensure clean state
    await clearDatabase()
  })

  it("requires authentication to save a recipe", async () => {
    const response = await request.post("/api/recipes/1/save")
    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", "Authentication required")
  })

  it("saves a recipe successfully", async () => {
    const response = await request
      .post("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("message", "Recipe saved successfully")

    // Verify the recipe was saved in the database
    const savedRecipes = await db
      .select()
      .from(savedRecipesTable)
      .where(
        and(eq(savedRecipesTable.userId, 1), eq(savedRecipesTable.recipeId, 1))
      )

    expect(savedRecipes.length).toBe(1)
  })

  it("handles duplicate saves gracefully", async () => {
    // Save once
    await request
      .post("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)

    // Try to save the same recipe again
    const response = await request
      .post("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)

    // Should fail with a constraint error, but handled gracefully
    expect(response.status).toBe(500)
    expect(response.body).toHaveProperty("error")
  })

  it("unsaves a recipe successfully", async () => {
    // First save the recipe
    await request
      .post("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)

    // Then unsave it
    const response = await request
      .delete("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty(
      "message",
      "Recipe unsaved successfully"
    )

    // Verify the recipe was removed from the database
    const savedRecipes = await db
      .select()
      .from(savedRecipesTable)
      .where(
        and(eq(savedRecipesTable.userId, 1), eq(savedRecipesTable.recipeId, 1))
      )

    expect(savedRecipes.length).toBe(0)
  })

  it("gets user's saved recipes correctly", async () => {
    // Save two recipes
    await request
      .post("/api/recipes/1/save")
      .set("Authorization", `Bearer ${testToken}`)
    await request
      .post("/api/recipes/2/save")
      .set("Authorization", `Bearer ${testToken}`)

    // Get saved recipes
    const response = await request
      .get("/api/user/saved-recipes")
      .set("Authorization", `Bearer ${testToken}`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBe(2)

    // Check that both recipes are returned
    const recipeIds = response.body.map((recipe: { id: number }) => recipe.id)
    expect(recipeIds).toContain(1)
    expect(recipeIds).toContain(2)
  })

  it("returns empty array if no saved recipes", async () => {
    const response = await request
      .get("/api/user/saved-recipes")
      .set("Authorization", `Bearer ${testToken}`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBe(0)
  })
})

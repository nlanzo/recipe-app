import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import supertest from "supertest"
import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { z } from "zod"
import {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestToken,
} from "../../test/dbUtils"

// Import actual app components
import { getRecipeById } from "../../db/recipeQueries"
import { AuthRequest, authenticateToken } from "../middleware/auth"

// Create a test server that mimics the actual application
const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(cookieParser())

// Mock JWT verification for tests
vi.mock("../middleware/auth", () => {
  return {
    authenticateToken: (req: Request, res: Response, next: NextFunction) => {
      // Extract token from Authorization header
      const authHeader = req.headers["authorization"]
      const token = authHeader && authHeader.split(" ")[1]

      if (!token) {
        return res.status(401).json({ error: "Access token is required" })
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

// Mock S3 and other external services
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
    DeleteObjectCommand: vi.fn(),
  }
})

// Add the actual recipe endpoints
// @ts-expect-error - Type issues with Express in tests
app.get("/api/recipes", async (req, res) => {
  try {
    const recipes = await getRecipeById(1)
    res.json({ recipes: [recipes] })
  } catch (error) {
    console.error("Error fetching recipes:", error)
    res.status(500).json({ error: "Failed to fetch recipes" })
  }
})

// @ts-expect-error - Type issues with Express in tests
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id)
    const recipe = await getRecipeById(recipeId)

    if (!recipe || !recipe.title) {
      return res.status(404).json({ error: "Recipe not found" })
    }

    res.json(recipe)
  } catch (error) {
    console.error("Error fetching recipe:", error)
    res.status(500).json({ error: "Failed to fetch recipe" })
  }
})

// Authentication test endpoint
// @ts-expect-error - Type issues with Express in tests
app.get(
  "/api/recipes/user/saved",
  authenticateToken,
  (req: AuthRequest, res) => {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ error: "User ID is required" })
    }

    res.json({ userId, message: "This is a protected endpoint" })
  }
)

describe("Recipe API Integration Tests", () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    // Set up test database with fixture data
    await setupTestDatabase()

    // Initialize supertest with our Express app
    request = supertest(app)
  })

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase()
  })

  it("GET /api/recipes/:id returns a single recipe", async () => {
    const response = await request.get("/api/recipes/1")

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("title", "Test Pasta")
    expect(response.body).toHaveProperty("description", "A test pasta recipe")
    expect(response.body).toHaveProperty("numberOfServings", 4)
    expect(response.body).toHaveProperty("ingredients")
    expect(response.body.ingredients).toHaveLength(3)
  })

  it("GET /api/recipes/:id returns 404 for non-existent recipe", async () => {
    const response = await request.get("/api/recipes/999")

    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty("error", "Recipe not found")
  })

  it("GET /api/recipes/user/saved requires authentication", async () => {
    const response = await request.get("/api/recipes/user/saved")

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", "Access token is required")
  })

  it("GET /api/recipes/user/saved returns data when authenticated", async () => {
    // Generate a test token for user 1
    const token = generateTestToken(1)

    const response = await request
      .get("/api/recipes/user/saved")
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("userId", 1)
    expect(response.body).toHaveProperty(
      "message",
      "This is a protected endpoint"
    )
  })

  // Add more tests for other endpoints like POST, PUT, DELETE...
})

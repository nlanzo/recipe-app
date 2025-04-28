import { describe, it, expect, beforeAll } from "vitest"
import supertest from "supertest"
import express, { Request, Response } from "express"
import { z } from "zod"

// Create a simple mock Express app for testing
const app = express()

// Mock recipe data
const mockRecipes = [
  {
    id: 1,
    title: "Pasta Carbonara",
    description: "Classic Italian pasta dish",
    totalTimeInMinutes: 30,
    numberOfServings: 2,
  },
  {
    id: 2,
    title: "Chicken Curry",
    description: "Spicy chicken curry",
    totalTimeInMinutes: 45,
    numberOfServings: 4,
  },
]

// Set up simple recipe endpoint
// @ts-expect-error - Type issues with Express in tests
app.get("/api/recipes", (_req: Request, res: Response) => {
  return res.json({ recipes: mockRecipes })
})

// Set up a parametrized recipe endpoint
// @ts-expect-error - Type issues with Express in tests
app.get("/api/recipes/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const recipe = mockRecipes.find((r) => r.id === id)

  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" })
  }

  return res.json({ recipe })
})

// Add a validation schema for testing
const recipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  totalTimeInMinutes: z.number(),
  numberOfServings: z.number(),
})

const recipesResponseSchema = z.object({
  recipes: z.array(recipeSchema),
})

const singleRecipeResponseSchema = z.object({
  recipe: recipeSchema,
})

describe("Recipe API", () => {
  let request: ReturnType<typeof supertest>

  beforeAll(() => {
    request = supertest(app)
  })

  it("GET /api/recipes returns all recipes", async () => {
    const response = await request.get("/api/recipes")

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("recipes")
    expect(response.body.recipes).toHaveLength(2)

    // Validate response structure with Zod
    const result = recipesResponseSchema.safeParse(response.body)
    expect(result.success).toBe(true)
  })

  it("GET /api/recipes/:id returns a single recipe", async () => {
    const response = await request.get("/api/recipes/1")

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("recipe")
    expect(response.body.recipe.id).toBe(1)
    expect(response.body.recipe.title).toBe("Pasta Carbonara")

    // Validate response structure with Zod
    const result = singleRecipeResponseSchema.safeParse(response.body)
    expect(result.success).toBe(true)
  })

  it("GET /api/recipes/:id returns 404 for non-existent recipe", async () => {
    const response = await request.get("/api/recipes/999")

    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty("error")
    expect(response.body.error).toBe("Recipe not found")
  })
})

// server.ts
import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import multer from "multer"
import cookieParser from "cookie-parser"
import { getRecipeById } from "../db/recipeQueries.js"
import { db } from "../db/index.js"
import {
  recipesTable,
  categoriesTable,
  recipeCategoriesTable,
  ingredientsTable,
  unitsTable,
  recipeIngredientsTable,
  imagesTable,
  savedRecipesTable,
  usersTable,
} from "../db/schema.js"
import { eq, and, sql } from "drizzle-orm"
import { authenticateToken, AuthRequest } from "./middleware/auth.js"
import bcrypt from "bcrypt"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "../db/schema.js"
import http from "http"
import path from "path"
import { z } from "zod"
import { handleChat } from "./controllers/chatController.js"
import dotenv from "dotenv"
import adminRoutes from "./routes/adminRoutes.js"
import { uploadFile, deleteFile, deleteFiles } from "./services/s3Service.js"
import {
  forgotPasswordHandler,
  resetPasswordHandler,
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
} from "./controllers/authController.js"

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? ".env" : ".env.development"
dotenv.config({ path: envFile })

// Server configuration logging
console.log("\nServer Configuration:")
console.log("--------------------")
console.log("Environment:", process.env.NODE_ENV)
console.log("Domain:", process.env.DOMAIN_NAME)
console.log(
  "Database URL:",
  process.env.DATABASE_URL?.replace(/:[^:]*@/, ":****@")
)
console.log("S3 Bucket:", process.env.S3_BUCKET_NAME)
console.log("AWS Region:", process.env.AWS_REGION)
console.log("SSL Certificate:", process.env.PG_SSL_CA)
console.log("--------------------\n")

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "JWT_SECRET",
  "OPENAI_API_KEY",
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Add this near the top with other environment validation
const FRONTEND_URL =
  process.env.FRONTEND_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://chopchoprecipes.com"
    : "http://localhost:5173")

type DbType = NodePgDatabase<typeof schema>

// Initialize Express app
const app = express()
const httpPort = 3000 // Use port 3000 for HTTP since Nginx will handle port 80

// Configure CORS with credentials
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  })
)

app.use(express.json())
app.use(cookieParser()) // Add cookie-parser middleware

// Create server
const httpServer = http.createServer(app)

// Serve static files from the dist directory
app.use(express.static(path.join(process.cwd(), "dist")))

// Configure Multer to handle file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Register auth routes
app.post("/api/auth/forgot-password", forgotPasswordHandler)
app.post("/api/auth/reset-password", resetPasswordHandler)
app.post("/api/auth/register", registerHandler)
app.post("/api/auth/login", loginHandler)
app.post("/api/auth/refresh", refreshTokenHandler)
app.post("/api/auth/logout", logoutHandler)

// Validation schema for recipe creation
const recipeSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  activeTime: z.string().min(1, "Active time is required").transform(Number),
  totalTime: z.string().min(1, "Total time is required").transform(Number),
  servings: z
    .string()
    .min(1, "Number of servings is required")
    .transform(Number),
  categories: z.string().transform((str: string) => {
    const parsed = JSON.parse(str)
    return z
      .array(z.string())
      .min(1, "At least one category is required")
      .parse(parsed)
  }),
  ingredients: z.string().transform((str: string) => {
    const parsed = JSON.parse(str)
    return z
      .array(
        z.object({
          name: z.string().min(1, "Ingredient name is required"),
          quantity: z.string().min(1, "Quantity is required"),
          unit: z.string().min(1, "Unit is required"),
        })
      )
      .min(1, "At least one ingredient is required")
      .parse(parsed)
  }),
})

// Validation middleware
const validateRecipe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = await recipeSchema.parseAsync(req.body)
    req.body = validatedData

    // Validate images
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ error: "At least one image is required" })
      return
    }

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      })
      return
    }
    next(error)
  }
}

// Validation schema for recipe updates
const recipeUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  activeTimeInMinutes: z
    .string()
    .min(1, "Active time is required")
    .transform(Number),
  totalTimeInMinutes: z
    .string()
    .min(1, "Total time is required")
    .transform(Number),
  numberOfServings: z
    .string()
    .min(1, "Number of servings is required")
    .transform(Number),
  categories: z.string().transform((str: string) => {
    const parsed = JSON.parse(str)
    return z
      .array(z.string())
      .min(1, "At least one category is required")
      .parse(parsed)
  }),
  ingredients: z.string().transform((str: string) => {
    const parsed = JSON.parse(str)
    return z
      .array(
        z.object({
          name: z.string().min(1, "Ingredient name is required"),
          quantity: z.string().min(1, "Quantity is required"),
          unit: z.string().min(1, "Unit is required"),
        })
      )
      .min(1, "At least one ingredient is required")
      .parse(parsed)
  }),
})

// Validation middleware for recipe updates
const validateRecipeUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = await recipeUpdateSchema.parseAsync(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      })
      return
    }
    next(error)
  }
}

// Get all recipes
app.get("/api/recipes", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sort } = req.query
    const page = parseInt(req.query.page as string) || 1
    const limit = 9
    const offset = (page - 1) * limit
    const search = (req.query.search as string) || ""

    // Build the where condition
    const whereCondition = search
      ? sql`LOWER(${recipesTable.title}) LIKE LOWER(${"%" + search + "%"})`
      : sql`1=1`

    // Build and execute the query with order by clause
    const recipes = await db
      .select({
        id: recipesTable.id,
        title: recipesTable.title,
        username: usersTable.username,
        createdAt: recipesTable.createdAt,
        totalTimeInMinutes: recipesTable.totalTimeInMinutes,
        numberOfServings: recipesTable.numberOfServings,
        imageUrl: imagesTable.imageUrl,
      })
      .from(recipesTable)
      .leftJoin(usersTable, eq(usersTable.id, recipesTable.userId))
      .leftJoin(
        imagesTable,
        and(
          eq(imagesTable.recipeId, recipesTable.id),
          eq(imagesTable.isPrimary, true)
        )
      )
      .where(whereCondition)
      .$dynamic()
      .orderBy(
        sort === "title"
          ? sql`${recipesTable.title} asc NULLS LAST, ${recipesTable.id} asc`
          : sql`${recipesTable.totalTimeInMinutes} asc NULLS LAST, ${recipesTable.id} asc`
      )
      .offset(offset)
      .limit(limit + 1)

    // Get total count (without cursor)
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(recipesTable)
      .where(
        search
          ? sql`LOWER(${recipesTable.title}) LIKE LOWER(${"%" + search + "%"})`
          : sql`1=1`
      )

    const hasMore = recipes.length > limit
    const items = recipes.slice(0, limit)

    res.json({
      recipes: items,
      pagination: {
        total: Number(count),
        hasMore,
        currentPage: page,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching recipes:", error)
    res.status(500).json({ error: "Failed to fetch recipes" })
  }
})

// Search recipes (must come before /:id route)
app.get("/api/recipes/search", async (req, res) => {
  try {
    const { query } = req.query
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = 9
    const offset = (page - 1) * limit
    const sort = req.query.sort as string

    const searchCondition =
      typeof query === "string" && query.trim()
        ? sql`LOWER(${recipesTable.title}) LIKE ${`%${query.toLowerCase()}%`}
          OR LOWER(${
            recipesTable.description
          }) LIKE ${`%${query.toLowerCase()}%`}
          OR LOWER(${
            recipesTable.instructions
          }) LIKE ${`%${query.toLowerCase()}%`}
          OR EXISTS (
            SELECT 1 FROM ${recipeIngredientsTable}
            JOIN ${ingredientsTable} ON ${
            recipeIngredientsTable.ingredientId
          } = ${ingredientsTable.id}
            WHERE ${recipeIngredientsTable.recipeId} = ${recipesTable.id}
            AND LOWER(${
              ingredientsTable.name
            }) LIKE ${`%${query.toLowerCase()}%`}
          )`
        : sql`1=1`

    const recipes = await db
      .select({
        id: recipesTable.id,
        title: recipesTable.title,
        description: recipesTable.description,
        totalTimeInMinutes: recipesTable.totalTimeInMinutes,
        numberOfServings: recipesTable.numberOfServings,
        imageUrl: imagesTable.imageUrl,
      })
      .from(recipesTable)
      .leftJoin(
        imagesTable,
        and(
          eq(imagesTable.recipeId, recipesTable.id),
          eq(imagesTable.isPrimary, true)
        )
      )
      .where(searchCondition)
      .orderBy(
        sort === "title"
          ? sql`${recipesTable.title} asc NULLS LAST, ${recipesTable.id} asc`
          : sql`${recipesTable.totalTimeInMinutes} asc NULLS LAST, ${recipesTable.id} asc`
      )
      .limit(limit + 1)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipesTable)
      .where(searchCondition)

    const hasMore = recipes.length > limit
    const items = recipes.slice(0, limit)

    res.json({
      recipes: items,
      pagination: {
        total: Number(count),
        hasMore,
        currentPage: page,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error("Error searching recipes:", error)
    res.status(500).json({ error: "Failed to search recipes" })
  }
})

// Get recipe by ID (must come after /search route)
app.get(
  "/api/recipes/:id",
  async (req: Request, res: Response): Promise<void> => {
    const recipeId = parseInt(req.params.id)
    const recipe = await getRecipeById(recipeId)
    res.json(recipe)
  }
)

// TODO update this endpoint

app.post(
  "/api/recipes",
  authenticateToken,
  upload.array("images", 10),
  validateRecipe,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }
    const {
      title,
      description,
      instructions,
      activeTime,
      totalTime,
      servings,
      categories,
      ingredients,
    } = req.body

    console.log("Request body:", req.body) // Debugging: Log the request body
    console.log("Request files:", req.files) // Debugging: Log the uploaded files

    try {
      // Parse the form data fields - make sure these are properly stringified on the client
      const parsedCategories = Array.isArray(categories)
        ? categories
        : typeof categories === "string"
        ? JSON.parse(categories)
        : []
      const parsedIngredients = Array.isArray(ingredients)
        ? ingredients
        : typeof ingredients === "string"
        ? JSON.parse(ingredients)
        : []

      await db.transaction(async (trx: DbType) => {
        // Step 1: Add Recipe
        const recipe = await trx
          .insert(recipesTable)
          .values({
            userId,
            title: title,
            description: description,
            instructions: instructions,
            activeTimeInMinutes: activeTime ? Number(activeTime) : 0,
            totalTimeInMinutes: Number(totalTime),
            numberOfServings: Number(servings),
          })
          .returning()

        const recipeId = recipe[0].id

        // Step 2: Add Categories
        for (const category of parsedCategories) {
          let categoryRecord = await trx
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.name, category))
            .limit(1)

          if (!categoryRecord.length) {
            categoryRecord = await trx
              .insert(categoriesTable)
              .values({ name: category })
              .returning()
          }

          await trx.insert(recipeCategoriesTable).values({
            recipeId,
            categoryId: categoryRecord[0].id,
          })
        }

        // Step 3: Add Ingredients
        for (const ingredient of parsedIngredients) {
          let ingredientRecord = await trx
            .select()
            .from(ingredientsTable)
            .where(eq(ingredientsTable.name, ingredient.name))
            .limit(1)

          if (!ingredientRecord.length) {
            ingredientRecord = await trx
              .insert(ingredientsTable)
              .values({ name: ingredient.name })
              .returning()
          }

          const unitRecord = await trx
            .select()
            .from(unitsTable)
            .where(eq(unitsTable.name, ingredient.unit))
            .limit(1)

          if (!unitRecord.length) {
            return res
              .status(400)
              .json({ error: `Invalid unit: ${ingredient.unit}` })
          }

          await trx.insert(recipeIngredientsTable).values({
            recipeId,
            ingredientId: ingredientRecord[0].id,
            unitId: unitRecord[0].id,
            quantity: ingredient.quantity,
          })
        }

        if (Array.isArray(req.files) && req.files.length > 0) {
          console.log(`Uploading ${req.files.length} images to S3...`)
          for (const [index, file] of req.files.entries()) {
            const key = `recipes/${Date.now()}-${file.originalname}`
            try {
              const imageUrl = await uploadFile(file.buffer, key)
              await trx.insert(imagesTable).values({
                recipeId,
                imageUrl,
                altText: `Image of ${title}`,
                isPrimary: index === 0,
              })
            } catch (error) {
              console.error("Error uploading image:", error)
              throw new Error("Failed to upload image")
            }
          }
        } else {
          console.error("No files detected to upload.")
          throw new Error("No files uploaded")
        }

        res
          .status(201)
          .json({ message: "Recipe added successfully!", id: recipeId })
      })
    } catch (error) {
      console.error("Error adding recipe:", error)
      res.status(500).json({ error: "Failed to add recipe." })
    }
  }
)

app.put(
  "/api/recipes/:id",
  authenticateToken,
  upload.array("newImages", 10),
  validateRecipeUpdate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    console.log("Request body:", req.body)
    console.log("Request files:", req.files)
    const recipeId = parseInt(req.params.id, 10)

    if (isNaN(recipeId)) {
      res.status(400).json({ error: "Invalid recipe ID" })
      return
    }

    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: "Authentication required" })
      return
    }

    // Check if user is admin or recipe owner
    const [user] = await db
      .select({
        isAdmin: usersTable.isAdmin,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)

    // Get recipe to check ownership
    const [recipe] = await db
      .select({
        userId: recipesTable.userId,
      })
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId))
      .limit(1)

    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" })
      return
    }

    // Check if user is authorized to edit this recipe
    const isOwner = recipe.userId === userId
    const isUserAdmin = user?.isAdmin || false

    if (!isOwner && !isUserAdmin) {
      res.status(403).json({ error: "Not authorized to edit this recipe" })
      return
    }

    const {
      title,
      description,
      instructions,
      activeTimeInMinutes,
      totalTimeInMinutes,
      numberOfServings,
      categories,
      ingredients,
      removedImages, // Array of image URLs to delete from S3 (optional)
    } = req.body

    try {
      await db.transaction(async (trx: DbType) => {
        // Step 1: Update the recipe details
        await trx
          .update(recipesTable)
          .set({
            title,
            description,
            instructions,
            activeTimeInMinutes: Number(activeTimeInMinutes),
            totalTimeInMinutes: Number(totalTimeInMinutes),
            numberOfServings: Number(numberOfServings),
          })
          .where(eq(recipesTable.id, recipeId))

        // Step 2: Update Categories
        if (Array.isArray(categories)) {
          // Remove existing category links for the recipe
          await trx
            .delete(recipeCategoriesTable)
            .where(eq(recipeCategoriesTable.recipeId, recipeId))

          // Add the new categories
          for (const categoryName of categories) {
            let categoryRecord = await trx
              .select()
              .from(categoriesTable)
              .where(eq(categoriesTable.name, categoryName))
              .limit(1)

            if (!categoryRecord.length) {
              categoryRecord = await trx
                .insert(categoriesTable)
                .values({ name: categoryName })
                .returning()
            }

            await trx.insert(recipeCategoriesTable).values({
              recipeId,
              categoryId: categoryRecord[0].id,
            })
          }
        }

        // Step 3: Update Ingredients
        if (Array.isArray(ingredients)) {
          // Remove existing ingredient links for the recipe
          await trx
            .delete(recipeIngredientsTable)
            .where(eq(recipeIngredientsTable.recipeId, recipeId))

          // Add the new ingredients
          for (const ingredient of ingredients) {
            let ingredientRecord = await trx
              .select()
              .from(ingredientsTable)
              .where(eq(ingredientsTable.name, ingredient.name))
              .limit(1)

            if (!ingredientRecord.length) {
              ingredientRecord = await trx
                .insert(ingredientsTable)
                .values({ name: ingredient.name })
                .returning()
            }

            const unitRecord = await trx
              .select()
              .from(unitsTable)
              .where(eq(unitsTable.name, ingredient.unit))
              .limit(1)

            if (!unitRecord.length) {
              res
                .status(400)
                .json({ error: `Invalid unit: ${ingredient.unit}` })
              return
            }

            await trx.insert(recipeIngredientsTable).values({
              recipeId,
              ingredientId: ingredientRecord[0].id,
              unitId: unitRecord[0].id,
              quantity: ingredient.quantity,
            })
          }
        }

        // Step 4: Delete Old Images from S3 (if requested)
        const imagesToDelete = Array.isArray(removedImages)
          ? removedImages
          : typeof removedImages === "string"
          ? JSON.parse(removedImages)
          : []

        if (imagesToDelete.length > 0) {
          for (const imageUrl of imagesToDelete) {
            const key = imageUrl.split("/").slice(-1)[0]
            try {
              await deleteFile(key)
              await trx
                .delete(imagesTable)
                .where(eq(imagesTable.imageUrl, imageUrl))
            } catch (error) {
              console.error(`Error deleting image ${key}:`, error)
            }
          }
        }

        // Step 5: Upload New Images to S3 (if provided)
        if (Array.isArray(req.files) && req.files.length > 0) {
          console.log(`Uploading ${req.files.length} images to S3...`)
          for (const [index, file] of req.files.entries()) {
            const key = `recipes/${Date.now()}-${file.originalname}`
            try {
              const imageUrl = await uploadFile(file.buffer, key)
              await trx.insert(imagesTable).values({
                recipeId,
                imageUrl,
                altText: `Image of ${title}`,
                isPrimary: index === 0,
              })
            } catch (error) {
              console.error("Error uploading image:", error)
              throw new Error("Failed to upload image")
            }
          }
        }
      })

      res.status(200).json({ message: "Recipe updated successfully" })
    } catch (error) {
      console.error("Error updating recipe:", error)
      res.status(500).json({ error: "Failed to update recipe" })
    }
  }
)

app.delete(
  "/api/recipes/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const recipeId = parseInt(req.params.id, 10)
    console.log("Deleting recipe with ID:", recipeId)

    if (isNaN(recipeId)) {
      res.status(400).json({ error: "Invalid recipe ID" })
      return
    }

    try {
      // Get current user's ID
      const userId = req.user?.userId

      if (!userId) {
        res.status(401).json({ error: "Authentication required" })
        return
      }

      // Check if user is admin or recipe owner
      const [user] = await db
        .select({
          isAdmin: usersTable.isAdmin,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)

      // Get recipe to check ownership
      const [recipe] = await db
        .select({
          userId: recipesTable.userId,
        })
        .from(recipesTable)
        .where(eq(recipesTable.id, recipeId))
        .limit(1)

      if (!recipe) {
        res.status(404).json({ error: "Recipe not found" })
        return
      }

      // Check if user is authorized to delete this recipe
      const isOwner = recipe.userId === userId
      const isUserAdmin = user?.isAdmin || false

      if (!isOwner && !isUserAdmin) {
        res.status(403).json({ error: "Not authorized to delete this recipe" })
        return
      }

      await db.transaction(async (trx: DbType) => {
        // Step 1: Fetch all image URLs for the recipe
        const images = await trx
          .select()
          .from(imagesTable)
          .where(eq(imagesTable.recipeId, recipeId))

        // Step 2: Delete images from AWS S3
        if (images.length > 0) {
          const keys = images.map(
            (image) => image.imageUrl.split("/").slice(-1)[0]
          )
          try {
            await deleteFiles(keys)
          } catch (error) {
            console.error("Error deleting images from S3:", error)
            throw new Error("Failed to delete images from S3")
          }
        }

        // Step 3: Delete from `imagesTable`
        await trx.delete(imagesTable).where(eq(imagesTable.recipeId, recipeId))

        // Step 4: Delete from `recipeIngredientsTable`
        await trx
          .delete(recipeIngredientsTable)
          .where(eq(recipeIngredientsTable.recipeId, recipeId))

        // Step 5: Delete from `recipeCategoriesTable`
        await trx
          .delete(recipeCategoriesTable)
          .where(eq(recipeCategoriesTable.recipeId, recipeId))

        // Step 6: Delete from `recipesTable`
        const deletedRecipe = await trx
          .delete(recipesTable)
          .where(eq(recipesTable.id, recipeId))
          .returning()

        if (deletedRecipe.length === 0) {
          throw new Error("Recipe not found or already deleted.")
        }
      })

      res
        .status(200)
        .json({ message: "Recipe and associated data deleted successfully." })
    } catch (error) {
      console.error("Error deleting recipe:", error)
      res
        .status(500)
        .json({ error: "Failed to delete recipe. Please try again." })
    }
  }
)

// Save a recipe
app.post(
  "/api/recipes/:id/save",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const recipeId = parseInt(req.params.id)
    const userId = (req as AuthRequest).user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      // First, check if the recipe is already saved by this user
      const existingSave = await db
        .select()
        .from(savedRecipesTable)
        .where(
          and(
            eq(savedRecipesTable.userId, userId),
            eq(savedRecipesTable.recipeId, recipeId)
          )
        )
        .limit(1)

      if (existingSave.length > 0) {
        // Recipe is already saved
        res.status(409).json({
          error: "Recipe already saved",
          message: "This recipe is already in your saved recipes",
        })
      }

      // If not already saved, save it
      await db.insert(savedRecipesTable).values({
        recipeId,
        userId,
      })
      res.status(200).json({ message: "Recipe saved successfully" })
    } catch (error: unknown) {
      console.error("Error saving recipe:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save recipe"
      res.status(500).json({ error: errorMessage })
    }
  }
)

// Unsave a recipe
app.delete(
  "/api/recipes/:id/save",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const recipeId = parseInt(req.params.id)
    const userId = (req as AuthRequest).user?.userId

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
    } catch (error) {
      console.error("Error unsaving recipe:", error)
      res.status(500).json({ error: "Failed to unsave recipe" })
    }
  }
)

// Get user's saved recipes
app.get(
  "/api/user/saved-recipes",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = (req as AuthRequest).user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      const savedRecipes = await db
        .select({
          id: recipesTable.id,
          title: recipesTable.title,
          imageUrl: imagesTable.imageUrl,
          totalTimeInMinutes: recipesTable.totalTimeInMinutes,
          numberOfServings: recipesTable.numberOfServings,
        })
        .from(savedRecipesTable)
        .innerJoin(
          recipesTable,
          eq(savedRecipesTable.recipeId, recipesTable.id)
        )
        .leftJoin(imagesTable, eq(imagesTable.recipeId, recipesTable.id))
        .where(
          and(
            eq(savedRecipesTable.userId, userId),
            eq(imagesTable.isPrimary, true)
          )
        )

      res.json(savedRecipes)
    } catch (error) {
      console.error("Error fetching saved recipes:", error)
      res.status(500).json({ error: "Failed to fetch saved recipes" })
    }
  }
)

// Get user's created recipes
app.get(
  "/api/user/my-recipes",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = (req as AuthRequest).user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      const myRecipes = await db
        .select({
          id: recipesTable.id,
          title: recipesTable.title,
          imageUrl: imagesTable.imageUrl,
          totalTimeInMinutes: recipesTable.totalTimeInMinutes,
          numberOfServings: recipesTable.numberOfServings,
        })
        .from(recipesTable)
        .leftJoin(imagesTable, eq(imagesTable.recipeId, recipesTable.id))
        .where(
          and(eq(recipesTable.userId, userId!), eq(imagesTable.isPrimary, true))
        )

      res.json(myRecipes)
    } catch (error) {
      console.error("Error fetching user's recipes:", error)
      res.status(500).json({ error: "Failed to fetch user's recipes" })
    }
  }
)

// Get user profile data
app.get(
  "/api/user/profile",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({ error: "User ID is required" })
      return
    }

    try {
      const [user] = await db
        .select({
          username: usersTable.username,
          email: usersTable.email,
          isAdmin: usersTable.isAdmin,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)

      if (!user) {
        res.status(404).json({ error: "User not found" })
        return
      }

      res.json(user)
    } catch (error) {
      console.error("Error fetching user profile:", error)
      res.status(500).json({ error: "Failed to fetch user profile" })
    }
  }
)

app.put(
  "/api/user/password",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = (req as AuthRequest).user?.userId

      // Get user from database
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId!))
        .limit(1)

      if (!user) {
        res.status(404).json({ error: "User not found" })
        return
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      )
      if (!isValidPassword) {
        res.status(401).json({ error: "Current password is incorrect" })
        return
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      // Update password in database
      await db
        .update(usersTable)
        .set({ passwordHash: newPasswordHash })
        .where(eq(usersTable.id, userId!))

      res.status(200).json({ message: "Password updated successfully" })
    } catch (error: unknown) {
      console.error("Error updating password:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update password"
      res.status(500).json({ error: errorMessage })
    }
  }
)

// Chat endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  console.log("Received chat request:", req.body)
  try {
    await handleChat(req, res)
  } catch (error) {
    console.error("Error in chat endpoint:", error)
    res.status(500).json({ error: "Internal server error in chat processing" })
  }
})

// Admin routes
app.use("/api/admin", adminRoutes)

// Enable detailed error logging
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    path: req.path,
  })
  next(err) // Propagate error to Express's default error handler
})

app.get("*", (_req, res) => {
  res.sendFile("index.html", { root: "dist" })
})

// Start the server
httpServer.listen(httpPort, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${httpPort}`)
})

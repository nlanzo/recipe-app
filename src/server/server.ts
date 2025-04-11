// server.ts
import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import multer from "multer"
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import { getRecipeById, getRecipeCardData } from "../db/recipeQueries.js"
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
import { eq, and, gt, sql, ilike } from "drizzle-orm"
import { AuthService } from "./services/authService.js"
import { authenticateToken, AuthRequest } from "./middleware/auth.js"
import bcrypt from "bcrypt"
import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "../db/schema.js"
import http from "http"
import path from "path"
import { z } from "zod"
import { handleChat } from "./controllers/chatController.js"
import crypto from "crypto"
import dotenv from "dotenv"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

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

// Define custom type for async request handlers
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

// Initialize Express app
const app = express()
const httpPort = 3000 // Use port 3000 for HTTP since Nginx will handle port 80

// Configure CORS
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  })
)

app.use(express.json())

// Create server
const httpServer = http.createServer(app)

// Serve static files from the dist directory
app.use(express.static(path.join(process.cwd(), "dist")))

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Configure Multer to handle file uploads
const storage = multer.memoryStorage() // Store uploaded files in memory
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

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
app.get("/api/recipes", async (_req: Request, res: Response): Promise<void> => {
  const recipes = await getRecipeCardData()
  res.json(recipes)
})

// Search recipes (must come before /:id route)
app.get(
  "/api/recipes/search",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, sort } = req.query
      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Search query is required" })
        return
      }

      const baseQuery = db
        .select({
          id: recipesTable.id,
          title: recipesTable.title,
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
        .where(ilike(recipesTable.title, `%${query}%`))

      // Add sorting
      const recipes = await (typeof sort === "string"
        ? sort === "title"
          ? baseQuery.orderBy(sql`${recipesTable.title} asc`)
          : sort === "time"
          ? baseQuery.orderBy(sql`${recipesTable.totalTimeInMinutes} asc`)
          : baseQuery
        : baseQuery
      ).limit(20)

      res.json(recipes)
    } catch (error) {
      console.error("Error searching recipes:", error)
      res.status(500).json({ error: "Failed to search recipes" })
    }
  }
)

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
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.userId
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
      const parsedCategories = categories ? JSON.parse(categories) : []
      const parsedIngredients = ingredients ? JSON.parse(ingredients) : []

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
            const s3Params = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `recipes/${Date.now()}-${file.originalname}`, // Unique filename
              Body: file.buffer,
              ContentType: file.mimetype,
            }

            const uploadCommand = new PutObjectCommand({
              ...s3Params,
            })
            try {
              const s3Response = await s3Client.send(uploadCommand)
              console.log("S3 Response:", s3Response)
            } catch (caught) {
              if (
                caught instanceof S3ServiceException &&
                caught.name === "EntityTooLarge"
              ) {
                console.error("Image is too large:", caught)
              } else if (caught instanceof S3ServiceException) {
                console.error(
                  `Error from S3 while uploading object to ${s3Params.Bucket}.  ${caught.name}: ${caught.message}`
                )
                throw new Error("S3 upload failed")
              } else {
                throw caught
              }
            }

            const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`

            await trx.insert(imagesTable).values({
              recipeId,
              imageUrl, // The S3 URL
              altText: `Image of ${title}`,
              isPrimary: index === 0, // Mark the first image as primary
            })
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
  async (req: Request, res: Response): Promise<void> => {
    console.log("Request body:", req.body)
    console.log("Request files:", req.files)
    const recipeId = parseInt(req.params.id, 10)

    if (isNaN(recipeId)) {
      res.status(400).json({ error: "Invalid recipe ID" })
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
        const imagesToDelete = JSON.parse(removedImages)
        if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
          for (const imageUrl of imagesToDelete) {
            console.log(imageUrl)
            const key = imageUrl.split("/").slice(-1)[0] // Extract the key from the URL
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
            })

            try {
              await s3Client.send(deleteCommand)
            } catch (s3Error) {
              console.error(`Error deleting image ${key} from S3:`, s3Error)
            }

            // Remove image record from the database
            await trx
              .delete(imagesTable)
              .where(eq(imagesTable.imageUrl, imageUrl))
          }
        } else {
          console.log("No images to delete.")
        }

        // Step 5: Upload New Images to S3 (if provided)
        if (Array.isArray(req.files) && req.files.length > 0) {
          console.log(`Uploading ${req.files.length} images to S3...`)
          for (const [index, file] of req.files.entries()) {
            const s3Params = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `recipes/${Date.now()}-${file.originalname}`, // Unique filename
              Body: file.buffer,
              ContentType: file.mimetype,
            }

            const uploadCommand = new PutObjectCommand({
              ...s3Params,
            })
            try {
              const s3Response = await s3Client.send(uploadCommand)
              console.log("S3 Response:", s3Response)
            } catch (caught) {
              if (
                caught instanceof S3ServiceException &&
                caught.name === "EntityTooLarge"
              ) {
                console.error("Image is too large:", caught)
              } else if (caught instanceof S3ServiceException) {
                console.error(
                  `Error from S3 while uploading object to ${s3Params.Bucket}.  ${caught.name}: ${caught.message}`
                )
                throw new Error("S3 upload failed")
              } else {
                throw caught
              }
            }

            const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`

            await trx.insert(imagesTable).values({
              recipeId,
              imageUrl, // The S3 URL
              altText: `Image of ${title}`,
              isPrimary: index === 0, // Mark the first image as primary
            })
          }
        }
      })

      res.status(200).json({ message: "Recipe updated successfully!" })
    } catch (error) {
      console.error("Error updating recipe:", error)
      res.status(500).json({ error: "Failed to update recipe." })
    }
  }
)

app.delete(
  "/api/recipes/:id",
  async (req: Request, res: Response): Promise<void> => {
    const recipeId = parseInt(req.params.id, 10)
    console.log("Deleting recipe with ID:", recipeId)

    if (isNaN(recipeId)) {
      res.status(400).json({ error: "Invalid recipe ID" })
      return
    }

    try {
      await db.transaction(async (trx: DbType) => {
        // Step 1: Fetch all image URLs for the recipe
        const images = await trx
          .select()
          .from(imagesTable)
          .where(eq(imagesTable.recipeId, recipeId))

        // Step 2: Delete images from AWS S3
        if (images.length > 0) {
          const objectsToDelete = images.map((image) => ({
            Key: image.imageUrl,
          }))
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Delete: { Objects: objectsToDelete },
          })

          try {
            await s3Client.send(deleteCommand)
            console.log("Images deleted from S3 successfully.")
          } catch (s3Error) {
            console.error("Error deleting images from S3:", s3Error)
            throw new Error("Failed to delete images from S3.")
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

// Configure AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION?.trim(),
  credentials: {
    accessKeyId:
      (
        process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
      )?.trim() ?? "",
    secretAccessKey:
      (
        process.env.AWS_SES_SECRET_ACCESS_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY
      )?.trim() ?? "",
  },
})

// Helper function to send emails using SES
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const params = {
      Source: process.env.SMTP_FROM?.trim() ?? "noreply@chopchoprecipes.com",
      Destination: {
        ToAddresses: [to.trim()],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    }

    console.log("Attempting to send email with params:", {
      source: params.Source,
      to: params.Destination.ToAddresses,
      subject: params.Message.Subject.Data,
      region: process.env.AWS_REGION?.trim(),
      hasAccessKey: Boolean(
        process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
      ),
      hasSecretKey: Boolean(
        process.env.AWS_SES_SECRET_ACCESS_KEY ||
          process.env.AWS_SECRET_ACCESS_KEY
      ),
    })

    const command = new SendEmailCommand(params)
    const result = await sesClient.send(command)
    console.log("Email sent successfully:", result.MessageId)
    return result
  } catch (error) {
    console.error("Error details:", {
      error,
      credentials: {
        region: process.env.AWS_REGION?.trim(),
        accessKeyId:
          process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
            ? "Set"
            : "Not set",
        secretAccessKey:
          process.env.AWS_SES_SECRET_ACCESS_KEY ||
          process.env.AWS_SECRET_ACCESS_KEY
            ? "Set"
            : "Not set",
        smtpFrom: process.env.SMTP_FROM?.trim(),
      },
    })
    throw new Error("Failed to send email")
  }
}

interface ForgotPasswordRequest {
  email: string
}

interface ResetPasswordRequest {
  token: string
  password: string
}

// Define request handlers with proper types
const forgotPasswordHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const { email } = req.body as ForgotPasswordRequest

    // Find user by email
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      res.json({
        message:
          "If an account exists with this email, you will receive a password reset link.",
      })
      return
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenHash = await bcrypt.hash(resetToken, 10)
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    await db
      .update(usersTable)
      .set({
        resetTokenHash,
        resetTokenExpiry,
      })
      .where(eq(usersTable.id, user.id))

    // Generate reset URL
    const passwordResetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`
    console.log("Generated reset URL (domain only):", FRONTEND_URL)

    // Send reset email
    await sendEmail(
      email,
      "Password Reset Request - ChopChop Recipes",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>You requested a password reset for your ChopChop Recipes account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${passwordResetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p style="color: #7f8c8d; font-size: 0.9em;">This link will expire in 1 hour.</p>
        <p style="color: #7f8c8d; font-size: 0.9em;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 0.8em;">ChopChop Recipes - Your Personal Recipe Collection</p>
      </div>
      `
    )

    res.json({
      message:
        "If an account exists with this email, you will receive a password reset link.",
    })
  } catch (error) {
    console.error("Error in forgot-password:", error)
    res.status(500).json({ error: "Failed to process password reset request" })
  }
}

const resetPasswordHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const { token, password } = req.body as ResetPasswordRequest

    // Find user with non-expired reset token
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          gt(usersTable.resetTokenExpiry, new Date()),
          // Only select users that have a reset token
          // This avoids unnecessary bcrypt comparisons
          sql`${usersTable.resetTokenHash} is not null`
        )
      )
      .limit(1)

    if (!user || !user.resetTokenHash) {
      res.status(400).json({ error: "Invalid or expired reset token" })
      return
    }

    // Verify the reset token
    const isValidToken = await bcrypt.compare(token, user.resetTokenHash)
    if (!isValidToken) {
      res.status(400).json({ error: "Invalid or expired reset token" })
      return
    }

    // Update password and clear reset token
    const passwordHash = await bcrypt.hash(password, 10)
    await db
      .update(usersTable)
      .set({
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiry: null,
      })
      .where(eq(usersTable.id, user.id))

    res.json({ message: "Password has been reset successfully" })
  } catch (error) {
    console.error("Error in reset-password:", error)
    res.status(500).json({ error: "Failed to reset password" })
  }
}

// Register routes with the app
app.post("/api/auth/forgot-password", forgotPasswordHandler)
app.post("/api/auth/reset-password", resetPasswordHandler)

// Add these routes to your existing Express app
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body
    const result = await AuthService.register({ username, email, password })
    res.json(result)
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed"
    res.status(400).json({ error: errorMessage })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await AuthService.login({ email, password })
    res.json(result)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Login failed"
    res.status(401).json({ error: errorMessage })
  }
})

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

// Add this after all your API routes, just before app.listen
// Catch-all route to serve index.html for client-side routing
app.get("*", (_req, res) => {
  res.sendFile("index.html", { root: "dist" })
})

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

// Start the server
httpServer.listen(httpPort, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${httpPort}`)
})

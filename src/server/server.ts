// server.ts
import express, { Request, Response } from "express"
import cors from "cors"
import multer from "multer"
import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import { getRecipeById, getRecipeCardData } from "../db/recipeQueries"
import { db } from "../db"
import {
  recipesTable,
  categoriesTable,
  recipeCategoriesTable,
  ingredientsTable,
  unitsTable,
  recipeIngredientsTable,
  imagesTable,
} from "../db/schema"
import { eq } from "drizzle-orm"

// Initialize Express app
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Configure Multer to handle file uploads
const storage = multer.memoryStorage() // Store uploaded files in memory
const upload = multer({ storage: storage })

// Query the database for the recipe with the specified ID
app.get("/api/recipes/:id", async (req: Request, res: Response) => {
  const recipeId = parseInt(req.params.id)
  const recipe = await getRecipeById(recipeId)
  res.json(recipe)
})

app.get("/api/recipes", async (_req: Request, res: Response) => {
  const recipes = await getRecipeCardData()
  res.json(recipes)
})

app.post("/api/recipes", upload.array("images", 10), async (req, res) => {
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

  const parsedCategories = JSON.parse(categories)
  const parsedIngredients = JSON.parse(ingredients)

  try {
    await db.transaction(async (trx) => {
      // Step 1: Add Recipe
      const recipe = await trx
        .insert(recipesTable)
        .values({
          title,
          description,
          instructions,
          activeTimeInMinutes: Number(activeTime),
          totalTimeInMinutes: Number(totalTime),
          numberOfServings: Number(servings),
          userId: 1, // Replace with actual user ID
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
              trx.rollback()
              break
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
        trx.rollback()
      }

      res.status(201).json({ message: "Recipe added successfully!" })
    })
  } catch (error) {
    console.error("Error adding recipe:", error)
    res.status(500).json({ error: "Failed to add recipe." })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

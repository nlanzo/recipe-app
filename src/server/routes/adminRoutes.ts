import { Router, Request, Response } from "express"
import { authenticateToken } from "../middleware/auth.js"
import { isAdmin } from "../middleware/adminAuth.js"
import { db } from "../../db/index.js"
import {
  recipesTable,
  usersTable,
  recipeIngredientsTable,
  recipeCategoriesTable,
  imagesTable,
} from "../../db/schema.js"
import { eq, ilike, sql, or } from "drizzle-orm"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

const router = Router()

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Get all recipes with pagination and search
router.get(
  "/recipes",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 0
      const limit = parseInt(req.query.limit as string) || 10
      const search = (req.query.search as string) || ""
      const offset = page * limit

      const baseQuery = db
        .select({
          id: recipesTable.id,
          title: recipesTable.title,
          description: recipesTable.description,
          totalTimeInMinutes: recipesTable.totalTimeInMinutes,
          numberOfServings: recipesTable.numberOfServings,
          userId: recipesTable.userId,
          username: usersTable.username,
          createdAt: recipesTable.createdAt,
        })
        .from(recipesTable)
        .leftJoin(usersTable, eq(recipesTable.userId, usersTable.id))

      const query = search
        ? baseQuery.where(
            or(
              ilike(recipesTable.title, `%${search}%`),
              ilike(recipesTable.description, `%${search}%`)
            )
          )
        : baseQuery

      const recipes = await query.limit(limit).offset(offset)

      // Get total count
      const baseCountQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(recipesTable)

      const countQuery = search
        ? baseCountQuery.where(
            or(
              ilike(recipesTable.title, `%${search}%`),
              ilike(recipesTable.description, `%${search}%`)
            )
          )
        : baseCountQuery

      const [{ count }] = await countQuery

      res.json({
        recipes,
        total: Number(count),
      })
    } catch (error) {
      console.error("Error fetching recipes:", error)
      res.status(500).json({ error: "Failed to fetch recipes" })
    }
  }
)

// Delete recipe (admin version - can delete any recipe)
router.delete(
  "/recipes/:id",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    const recipeId = parseInt(req.params.id)

    try {
      await db.transaction(async (trx) => {
        // Get images to delete from S3
        const images = await trx
          .select()
          .from(imagesTable)
          .where(eq(imagesTable.recipeId, recipeId))

        // Delete images from S3
        for (const image of images) {
          const key = image.imageUrl.split("/").slice(-1)[0]
          try {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: key,
              })
            )
          } catch (error) {
            console.error(`Failed to delete image ${key} from S3:`, error)
          }
        }

        // Delete recipe and related data
        await trx.delete(imagesTable).where(eq(imagesTable.recipeId, recipeId))
        await trx
          .delete(recipeIngredientsTable)
          .where(eq(recipeIngredientsTable.recipeId, recipeId))
        await trx
          .delete(recipeCategoriesTable)
          .where(eq(recipeCategoriesTable.recipeId, recipeId))
        await trx.delete(recipesTable).where(eq(recipesTable.id, recipeId))
      })

      res.json({ message: "Recipe deleted successfully" })
    } catch (error) {
      console.error("Error deleting recipe:", error)
      res.status(500).json({ error: "Failed to delete recipe" })
    }
  }
)

// Get all users with pagination and search
router.get(
  "/users",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 0
      const limit = parseInt(req.query.limit as string) || 10
      const search = (req.query.search as string) || ""
      const offset = page * limit

      const baseQuery = db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          createdAt: usersTable.createdAt,
          isAdmin: usersTable.isAdmin,
        })
        .from(usersTable)

      const query = search
        ? baseQuery.where(
            or(
              ilike(usersTable.username, `%${search}%`),
              ilike(usersTable.email, `%${search}%`)
            )
          )
        : baseQuery

      const users = await query
        .orderBy(usersTable.createdAt)
        .limit(limit)
        .offset(offset)

      // Get total count
      const baseCountQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable)

      const countQuery = search
        ? baseCountQuery.where(
            or(
              ilike(usersTable.username, `%${search}%`),
              ilike(usersTable.email, `%${search}%`)
            )
          )
        : baseCountQuery

      const [{ count }] = await countQuery

      res.json({
        users,
        total: Number(count),
        page,
        limit,
      })
    } catch (error) {
      console.error("Error fetching users:", error)
      res.status(500).json({ error: "Failed to fetch users" })
    }
  }
)

export default router

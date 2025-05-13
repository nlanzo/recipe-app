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
import { deleteFile } from "../services/s3Service.js"

const router = Router()

// Get all recipes with pagination and search
router.get(
  "/recipes",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = parseInt(req.query.limit as string) || 10
      const search = (req.query.search as string) || ""
      const offset = (page - 1) * limit

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
        currentPage: page,
        totalPages: Math.ceil(Number(count) / limit),
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
            await deleteFile(key)
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
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = parseInt(req.query.limit as string) || 10
      const search = (req.query.search as string) || ""
      const offset = (page - 1) * limit

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
        currentPage: page,
        totalPages: Math.ceil(Number(count) / limit),
      })
    } catch (error) {
      console.error("Error fetching users:", error)
      res.status(500).json({ error: "Failed to fetch users" })
    }
  }
)

// Get recipes for a specific user
router.get(
  "/users/:userId/recipes",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId)
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = parseInt(req.query.limit as string) || 10
      const offset = (page - 1) * limit

      // Fetch recipes for the user
      const recipes = await db
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
        .where(eq(recipesTable.userId, userId))
        .limit(limit)
        .offset(offset)

      // Get total count of recipes for this user
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(recipesTable)
        .where(eq(recipesTable.userId, userId))

      res.json({
        recipes,
        total: Number(count),
        currentPage: page,
        totalPages: Math.ceil(Number(count) / limit),
      })
    } catch (error) {
      console.error("Error fetching user recipes:", error)
      res.status(500).json({ error: "Failed to fetch user recipes" })
    }
  }
)

export default router

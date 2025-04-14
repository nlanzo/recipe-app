import { Request, Response, NextFunction } from "express"
import { db } from "../../db/index.js"
import { usersTable } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { AuthRequest } from "./auth.js"

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId

    if (!userId) {
      res.status(401).json({ error: "Authentication required" })
      return
    }

    const [user] = await db
      .select({
        isAdmin: usersTable.isAdmin,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)

    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Admin access required" })
      return
    }

    next()
  } catch (error) {
    console.error("Admin authentication error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

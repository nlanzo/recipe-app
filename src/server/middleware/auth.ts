import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthRequest extends Request {
  userId?: number
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    ;(req as AuthRequest).userId = decoded.userId
    next()
  } catch {
    res.status(403).json({ error: "Invalid token" })
    return
  }
}

import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthRequest extends Request {
  userId?: number
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Authentication required" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(403).json({ error: "Invalid token" })
  }
}

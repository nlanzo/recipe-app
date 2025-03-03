import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { db } from "../../db/index.js"
import { usersTable } from "../../db/schema.js"
import { eq } from "drizzle-orm"

const SALT_ROUNDS = 10
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key" // Make sure to add this to .env

interface RegisterInput {
  username: string
  email: string
  password: string
}

interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  static async register({ username, email, password }: RegisterInput) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create new user
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        passwordHash,
      })
      .returning()

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: "24h",
    })

    return { user: newUser, token }
  }

  static async login({ email, password }: LoginInput) {
    // Find user by email
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    if (!user) {
      throw new Error("Invalid credentials")
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      throw new Error("Invalid credentials")
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "24h",
    })

    return { user, token }
  }
}

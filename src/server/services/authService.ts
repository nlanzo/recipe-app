import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { db } from "../../db/index.js"
import { usersTable, refreshTokensTable } from "../../db/schema.js"
import { eq, and, lt, or, gt } from "drizzle-orm"
import crypto from "crypto"
import ms from "ms"

const SALT_ROUNDS = 10
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}
const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TOKEN_EXPIRY = "15m" // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d" // 7 days

interface RegisterInput {
  username: string
  email: string
  password: string
  isAdmin?: boolean
}

interface LoginInput {
  email: string
  password: string
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  private static generateTokenPair(userId: number): TokenPair {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    })
    const refreshToken = crypto.randomBytes(40).toString("hex")
    return { accessToken, refreshToken }
  }

  private static async storeRefreshToken(
    userId: number,
    refreshToken: string
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS)
    const expiresAt = new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRY))

    await db.insert(refreshTokensTable).values({
      userId,
      tokenHash,
      expiresAt,
    })
  }

  private static async revokeRefreshToken(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokensTable)
      .set({ revoked: true })
      .where(eq(refreshTokensTable.tokenHash, tokenHash))
  }

  private static async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(refreshTokensTable)
      .where(
        or(
          eq(refreshTokensTable.revoked, true),
          lt(refreshTokensTable.expiresAt, new Date())
        )
      )
  }

  static async register({
    username,
    email,
    password,
    isAdmin = false,
  }: RegisterInput) {
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
        isAdmin,
      })
      .returning()

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokenPair(newUser.id)

    // Store refresh token
    await this.storeRefreshToken(newUser.id, refreshToken)

    // Clean up expired tokens periodically
    await this.cleanupExpiredTokens()

    return { user: newUser, accessToken, refreshToken }
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

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokenPair(user.id)

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken)

    // Clean up expired tokens periodically
    await this.cleanupExpiredTokens()

    return { user, accessToken, refreshToken }
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    // Find the refresh token in the database
    const [storedToken] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.revoked, false),
          gt(refreshTokensTable.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!storedToken) {
      throw new Error("Invalid refresh token")
    }

    // Verify the refresh token
    const isValidToken = await bcrypt.compare(
      refreshToken,
      storedToken.tokenHash
    )
    if (!isValidToken) {
      throw new Error("Invalid refresh token")
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId: storedToken.userId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    })

    return accessToken
  }

  static async logout(refreshToken: string): Promise<void> {
    // Find and revoke the refresh token
    const [storedToken] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.revoked, false),
          eq(
            refreshTokensTable.tokenHash,
            await bcrypt.hash(refreshToken, SALT_ROUNDS)
          )
        )
      )
      .limit(1)

    if (storedToken) {
      await this.revokeRefreshToken(storedToken.tokenHash)
    }

    // Clean up expired tokens
    await this.cleanupExpiredTokens()
  }
}

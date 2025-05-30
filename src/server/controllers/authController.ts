import { Request, Response } from "express"
import { db } from "../../db/index.js"
import { usersTable } from "../../db/schema.js"
import { eq, and, gt, sql } from "drizzle-orm"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { AuthService } from "../services/authService.js"
import { EmailService } from "../services/emailService.js"

// Define types
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

interface ForgotPasswordRequest {
  email: string
}

interface ResetPasswordRequest {
  token: string
  password: string
}

// Handler functions
export const forgotPasswordHandler: AsyncRequestHandler = async (req, res) => {
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
    const FRONTEND_URL =
      process.env.FRONTEND_URL?.trim() ||
      (process.env.NODE_ENV === "production"
        ? "https://chopchoprecipes.com"
        : "http://localhost:5173")
    const passwordResetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`
    console.log("Generated reset URL (domain only):", FRONTEND_URL)

    // Send reset email
    await EmailService.sendEmail(
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

export const resetPasswordHandler: AsyncRequestHandler = async (req, res) => {
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

export const registerHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body
    const result = await AuthService.register({ username, email, password })

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Send access token in response
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed"
    res.status(400).json({ error: errorMessage })
  }
}

export const loginHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await AuthService.login({ email, password })

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Send access token in response
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Login failed"
    res.status(401).json({ error: errorMessage })
  }
}

export const refreshTokenHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      throw new Error("No refresh token provided")
    }

    const accessToken = await AuthService.refreshAccessToken(refreshToken)
    res.json({ accessToken })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed"
    res.status(401).json({ error: errorMessage })
  }
}

export const logoutHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (refreshToken) {
      await AuthService.logout(refreshToken)
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })

    res.json({ message: "Logged out successfully" })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Logout failed"
    res.status(500).json({ error: errorMessage })
  }
}

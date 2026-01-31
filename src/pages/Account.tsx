import { useEffect, useState } from "react"
import { Box, Typography, TextField, Button, Paper, Alert } from "@mui/material"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })

export default function Account() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Defensive: if token was cleared, bounce to login (ProtectedRoute should handle this too)
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { returnTo: "/account" } })
    }
  }, [token, navigate])

  const validateForm = (): boolean => {
    try {
      passwordChangeSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setFieldErrors({})
      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error) => {
          const path = error.path[0] as string
          errors[path] = error.message
        })
        setFieldErrors(errors)
      }
      return false
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password")
      }

      setSuccess("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <Box sx={{ maxWidth: "600px", mx: "auto", p: 4 }}>
      <Typography
        component="h4"
        sx={{
          fontSize: { xs: "2rem", md: "3rem" },
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 4,
          color: "secondary.main",
        }}
      >
        Account Settings
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography>
            <strong>Username:</strong> {user?.username}
          </Typography>
          <Typography>
            <strong>Email:</strong> {user?.email}
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box component="form" onSubmit={handlePasswordChange}>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              if (fieldErrors.currentPassword) validateForm()
            }}
            margin="normal"
            required
            error={!!fieldErrors.currentPassword}
            helperText={fieldErrors.currentPassword}
          />
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              if (fieldErrors.newPassword || fieldErrors.confirmPassword)
                validateForm()
            }}
            margin="normal"
            required
            error={!!fieldErrors.newPassword}
            helperText={fieldErrors.newPassword}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (fieldErrors.confirmPassword) validateForm()
            }}
            margin="normal"
            required
            error={!!fieldErrors.confirmPassword}
            helperText={fieldErrors.confirmPassword}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Update Password
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

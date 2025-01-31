import { useState } from "react"
import { Box, Typography, TextField, Button, Paper, Alert } from "@mui/material"
import { useAuth } from "../contexts/useAuth"

export default function Account() {
  const { user, token } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
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
      <Typography variant="h4" gutterBottom>
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
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
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

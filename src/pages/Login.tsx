import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/useAuth"
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
} from "@mui/material"

interface LocationState {
  returnTo?: string
}

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      login(data.accessToken, data.user)

      // Navigate to the return URL if it exists, otherwise go to home
      const state = location.state as LocationState
      navigate(state?.returnTo || "/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
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
          Login
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />
          <Typography align="right" sx={{ mb: 2 }}>
            <Link href="/forgot-password" underline="hover">
              Forgot Password?
            </Link>
          </Typography>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </Button>
          <Typography align="center">
            Don't have an account?{" "}
            <Link href="/register" underline="hover">
              Register here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}

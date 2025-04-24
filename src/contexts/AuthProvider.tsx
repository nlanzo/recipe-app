import { useState, useEffect, ReactNode } from "react"
import { User } from "./types"
import { AuthContext } from "./AuthContext"
import { setAccessToken, refreshAccessToken } from "../utils/auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      try {
        // First check for existing token in localStorage (legacy support)
        const storedToken = localStorage.getItem("token")
        const storedUser = localStorage.getItem("user")

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } else {
          // Try to refresh the token using the HTTP-only cookie
          try {
            const newToken = await refreshAccessToken()
            // If we have a token but no user, fetch the user data
            // This would need a proper endpoint to fetch user data by token
            setToken(newToken)
          } catch {
            // If refresh fails, that's okay - user is just not logged in
            console.log("No valid session found")
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    setAccessToken(newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
  }

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      setToken(null)
      setUser(null)
      setAccessToken(null)
      localStorage.removeItem("user")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

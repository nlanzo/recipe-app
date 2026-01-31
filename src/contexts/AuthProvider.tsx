import { useState, useEffect, ReactNode } from "react"
import { User } from "./types"
import { AuthContext } from "./AuthContext"
import {
  getAccessToken,
  setAccessToken,
  refreshAccessToken,
} from "../utils/auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Keep context state in sync with the token stored by utils/auth
  useEffect(() => {
    const syncFromUtil = () => {
      const t = getAccessToken()
      setToken(t)
      if (!t) {
        setUser(null)
        localStorage.removeItem("user")
      }
    }

    syncFromUtil()

    const onToken = () => syncFromUtil()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") syncFromUtil()
    }

    window.addEventListener("auth:token", onToken as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("auth:token", onToken as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      try {
        // First check for existing token in localStorage (legacy support)
        const storedToken = localStorage.getItem("token")
        const storedUser = localStorage.getItem("user")

        if (storedToken && storedUser) {
          // Ensure the shared token store is updated too
          setAccessToken(storedToken)
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } else if (storedToken) {
          // We have a token but no user - try to refresh to get a valid session
          // This handles cases where localStorage token expired but refresh cookie is still valid
          try {
            const newToken = await refreshAccessToken()
            setToken(newToken)
          } catch {
            // If refresh fails, clear the stale token
            setAccessToken(null)
            setToken(null)
            console.log("No valid session found")
          }
        }
        // If no token at all, don't attempt refresh - user is definitely not logged in
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

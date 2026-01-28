import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../contexts/useAuth"
import { refreshAccessToken } from "../utils/auth"

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const location = useLocation()
  const [isVerified, setIsVerified] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      // While auth is initializing, don't do anything yet
      if (isLoading) return

      if (!isAuthenticated) {
        setShouldRedirect(true)
        return
      }

      try {
        // Validate session via refresh-cookie. If refresh is expired, this will throw.
        await refreshAccessToken()
        if (!cancelled) {
          setIsVerified(true)
        }
      } catch {
        // Session is no longer valid. Clear local auth state and redirect.
        try {
          await logout()
        } finally {
          if (!cancelled) {
            setShouldRedirect(true)
          }
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, logout])

  if (isLoading || (isAuthenticated && !isVerified && !shouldRedirect)) {
    return null
  }

  if (shouldRedirect) {
    return (
      <Navigate to="/login" replace state={{ returnTo: location.pathname }} />
    )
  }

  return <>{children}</>
}

import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/useAuth"

interface AdminRouteProps {
  children: ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
}

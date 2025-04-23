let accessToken: string | null = localStorage.getItem("token")
let refreshPromise: Promise<string> | null = null

export const getAccessToken = (): string | null => accessToken

export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) {
    localStorage.setItem("token", token)
  } else {
    localStorage.removeItem("token")
  }
}

export const refreshAccessToken = async (): Promise<string> => {
  try {
    // If there's already a refresh in progress, return that promise
    if (refreshPromise) {
      return refreshPromise
    }

    // Create a new refresh promise
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include", // Important for sending cookies
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to refresh token")
        }
        return response.json()
      })
      .then((data) => {
        setAccessToken(data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })

    return refreshPromise
  } catch (error) {
    console.error("Error refreshing token:", error)
    setAccessToken(null)
    throw error
  }
}

export const createAuthenticatedFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // Try to get the access token
    let token = getAccessToken()

    // If no token, try to refresh
    if (!token) {
      try {
        token = await refreshAccessToken()
      } catch (error) {
        // If refresh fails, redirect to login
        window.location.href = "/login"
        throw error
      }
    }

    // Add the token to the headers
    const headers = new Headers(init?.headers)
    headers.set("Authorization", `Bearer ${token}`)

    // Make the request
    const response = await fetch(input, {
      ...init,
      headers,
    })

    // If we get a 401, try to refresh the token
    if (response.status === 401) {
      try {
        token = await refreshAccessToken()

        // Retry the request with the new token
        headers.set("Authorization", `Bearer ${token}`)
        return fetch(input, {
          ...init,
          headers,
        })
      } catch (error) {
        // If refresh fails, redirect to login
        window.location.href = "/login"
        throw error
      }
    }

    return response
  }
}

export const authenticatedFetch = createAuthenticatedFetch()

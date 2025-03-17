// src/utils/api.ts
export async function authenticatedFetch(
  url: string,
  token: string | null,
  options: RequestInit = {}
) {
  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : "",
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Handle unauthorized error - maybe redirect to login
    window.location.href = "/login"
  }

  return response
}

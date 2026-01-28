import { useState, useEffect } from "react"
import { createAuthenticatedFetch } from "../utils/auth"

export function useDataLoader<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<Response | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    async function fetchData() {
      try {
        setIsLoading(true)
        
        // Use authenticatedFetch with preventRedirect for all routes
        // This allows public routes to work even if the token is expired,
        // and protected routes will still work if authenticated
        const safeFetch = createAuthenticatedFetch({ preventRedirect: true })
        const response = await safeFetch(url, {
          signal: abortController.signal,
        })

        setResponse(response)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setData(data)
        setError(null)
      } catch (err) {
        if (abortController.signal.aborted) {
          console.log("Fetch aborted")
          return
        }
        setError("Failed to fetch data. Please try again later.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      abortController.abort()
    }
  }, [url])

  return { data, error, isLoading, response }
}

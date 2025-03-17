import { useState, useEffect } from "react"
import { authenticatedFetch } from "../utils/api"
import { useAuth } from "../contexts/useAuth"

export function useDataLoader<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<Response | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    const abortController = new AbortController()
    async function fetchData() {
      if (!token) {
        setData(null)
        return
      }

      try {
        setIsLoading(true)
        const response = await authenticatedFetch(url, token, {
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
  }, [url, token])

  return { data, error, isLoading, response }
}

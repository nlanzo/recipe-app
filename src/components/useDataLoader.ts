import { useState, useEffect } from "react"

export function useDataLoader<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()
    async function fetchData() {
      try {
        const data = await fetch(url, {
          signal: abortController.signal,
        }).then((res) => res.json())
        setData(data)
      } catch (err) {
        if (abortController.signal.aborted) {
          console.log("Fetch aborted")
          return
        }
        setError("Failed to fetch data. Please try again later.")
        console.error(err)
      }
      setIsLoading(false)
    }
    setIsLoading(true)
    fetchData()
    return () => {
      // Cleanup function
      abortController.abort()
    }
  }, [url])
  return { data, error, isLoading }
}

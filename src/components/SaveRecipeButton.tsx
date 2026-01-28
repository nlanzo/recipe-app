import { useState, useEffect, useCallback } from "react"
import { Button } from "@mui/material"
import { BsBookmark, BsBookmarkFill } from "react-icons/bs"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import { authenticatedFetch, createAuthenticatedFetch } from "../utils/auth"

interface Props {
  recipeId: string
}

interface SavedRecipe {
  id: number
  // Add other recipe properties if needed
}

export default function SaveRecipeButton({ recipeId }: Props) {
  const [isSaved, setIsSaved] = useState(false)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const checkSavedStatus = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // Use authenticatedFetch with preventRedirect option since we're on a public page
      // This prevents redirecting to login if the token is expired
      const safeFetch = createAuthenticatedFetch({ preventRedirect: true })

      const response = await safeFetch(`/api/user/saved-recipes`)
      if (!response.ok) {
        // If we get a 401/403, the user is no longer authenticated
        // Don't redirect - just silently fail and let them see the page
        if (response.status === 401 || response.status === 403) {
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const savedRecipes: SavedRecipe[] = await response.json()
      setIsSaved(
        savedRecipes.some((recipe) => recipe.id === parseInt(recipeId)),
      )
    } catch (error) {
      // Silently handle auth errors - don't redirect on public pages
      // Token refresh failed - user is no longer authenticated
      // Just return without setting saved status
      console.error("Error checking saved status:", error)
    }
  }, [recipeId, isAuthenticated])

  useEffect(() => {
    // Check if recipe is saved
    checkSavedStatus()
  }, [checkSavedStatus])

  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnTo: `/recipes/${recipeId}` } })
      return
    }

    try {
      const response = await authenticatedFetch(
        `/api/recipes/${recipeId}/save`,
        {
          method: isSaved ? "DELETE" : "POST",
        },
      )

      // If the recipe is already saved, the server returns 409, which is still a successful state for the client
      if (response.ok || response.status === 409) {
        setIsSaved(!isSaved)
      }
    } catch (error) {
      console.error("Error toggling save status:", error)
    }
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleSaveToggle}
      startIcon={
        isAuthenticated && isSaved ? <BsBookmarkFill /> : <BsBookmark />
      }
    >
      {isAuthenticated ? (isSaved ? "Saved" : "Save Recipe") : "Login to Save"}
    </Button>
  )
}

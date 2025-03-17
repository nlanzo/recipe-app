import { useState, useEffect, useCallback } from "react"
import { Button } from "@mui/material"
import { BsBookmark, BsBookmarkFill } from "react-icons/bs"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"

interface Props {
  recipeId: string
}

interface SavedRecipe {
  id: number
  // Add other recipe properties if needed
}

export default function SaveRecipeButton({ recipeId }: Props) {
  const [isSaved, setIsSaved] = useState(false)
  const { token, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const checkSavedStatus = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const response = await fetch(`/api/user/saved-recipes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const savedRecipes: SavedRecipe[] = await response.json()
      setIsSaved(
        savedRecipes.some((recipe) => recipe.id === parseInt(recipeId))
      )
    } catch (error) {
      console.error("Error checking saved status:", error)
    }
  }, [recipeId, token, isAuthenticated])

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
      const response = await fetch(`/api/recipes/${recipeId}/save`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
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

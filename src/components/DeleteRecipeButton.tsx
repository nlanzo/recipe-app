import { Alert, Button } from "@mui/material"
import { useState, useTransition } from "react"
import { TiDelete } from "react-icons/ti"
import { useNavigate } from "react-router-dom"

interface DeleteRecipeButtonProps {
  id: string
}

export default function DeleteRecipeButton({ id }: DeleteRecipeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function deleteRecipe(id: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/recipes/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete recipe")
      } else {
        // Redirect to the homepage
        navigate("/")
      }
    } catch (error) {
      console.error("Failed to delete recipe", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("An unknown error occurred")
      }
    }
  }

  const handleDelete = () => {
    startTransition(() => {
      deleteRecipe(id).catch((error) => {
        console.error("Failed to delete recipe", error)
        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError("An unknown error occurred")
        }
      })
    })
  }

  return (
    <Button
      variant="contained"
      color="error"
      onClick={() => startTransition(() => handleDelete())}
      disabled={isPending}
    >
      <TiDelete />
      {isPending ? "Deleting..." : "Delete recipe"}
      {error && <Alert severity="error">{error}</Alert>}
    </Button>
  )
}

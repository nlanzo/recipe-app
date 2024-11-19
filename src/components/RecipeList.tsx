import Grid from "@mui/material/Grid2"
import { Box, Typography } from "@mui/material"
import RecipeCard from "./RecipeCard"
import { getRecipeCardData } from "../db/recipeQueries"
import { useEffect, useState } from "react"

interface Recipe {
  id: number
  title: string
  imageUrl: string | null
  totalTimeInMinutes: number
  numberOfServings: number
}

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await getRecipeCardData()
        setRecipes(data)
      } catch (err) {
        setError("Failed to fetch recipes. Please try again later.")
      }
    }

    fetchRecipes()
  }, [])

  return (
    <Box sx={{ p: 2 }}>
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid
          container
          spacing={2}
          justifyContent="center"
          alignItems="stretch"
        >
          {recipes.map((recipe) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 4 }}
              key={recipe.id}
              className="flex"
            >
              <RecipeCard {...recipe} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

import Grid from "@mui/material/Grid2"
import { Box, Typography } from "@mui/material"
import RecipeCard from "./RecipeCard"
import { useDataLoader } from "./useDataLoader"

interface Recipe {
  id: number
  title: string
  imageUrl: string | null
  totalTimeInMinutes: number
  numberOfServings: number
}

export default function RecipeList() {
  const data = useDataLoader<Recipe[]>("http://localhost:3000/api/recipes")

  if (data.isLoading) {
    return <Typography>Loading...</Typography>
  }
  return (
    <Box sx={{ p: 2, maxWidth: "xl", mx: "auto" }}>
      {data.error ? (
        <Typography color="error">{data.error}</Typography>
      ) : (
        <Grid
          container
          spacing={2}
          justifyContent="center"
          alignItems="stretch"
        >
          {data.data?.map((recipe) => (
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

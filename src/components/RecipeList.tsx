import Grid from "@mui/material/Grid2"
import { Box } from "@mui/material"
import RecipeCard from "./RecipeCard"

const RecipeList = ({ recipes }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2} justifyContent="center" alignItems="stretch">
        {recipes.map((recipe) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4 }}
            key={recipe.id}
            className="flex"
          >
            <RecipeCard recipe={recipe} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default RecipeList

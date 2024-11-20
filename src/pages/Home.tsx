import { Button, Box, Typography } from "@mui/material"
import Grid from "@mui/material/Grid2"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  const handleViewRecipesClick = () => {
    navigate("/recipes") // Navigate to the recipes page
  }

  return (
    <Box component="div">
      <Grid container spacing={2} justifyContent="center" alignItems="stretch">
        {/* Splash Image */}
        <img
          src="./plate-of-food.jpg"
          alt="Plate of meat, potatoes, and salad"
        />

        {/* Website Description */}
        <Typography variant="h1">
          Cooking Made Fun and Easy: Unleash Your Inner Chef
        </Typography>

        {/* Button to View Recipes */}
        <Button
          variant="contained"
          size="large"
          onClick={handleViewRecipesClick}
        >
          Explore Recipes
        </Button>
      </Grid>
    </Box>
  )
}
